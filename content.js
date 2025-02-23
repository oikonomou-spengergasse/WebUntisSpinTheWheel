console.log("Content script loaded on", window.location.href);
//const untisColor = "#fe6033"
const runtime = (chrome || browser).runtime;
const id = "WheelButtons"

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

//at least 100ms at most maxDuration, default 1000 *  f(x) = (e^(0.27x) / e^(0.27*50))
function durationForIndex(numElems, index, offsetDuration = 100, maxDuration = 1000) {
    return offsetDuration + (maxDuration * (Math.pow(Math.E, 0.27 * index) / Math.pow(Math.E, 0.27 * numElems)))
}

function initExtensionFunctionality(document, studentNodes, menuNode) {

    let spinning     = false;
    const students    = [...studentNodes].map(extractStudent);
    let participating = students;
    const spinButton          = document.createElement("button");
    const resetButton         = document.createElement("button");

    function toggleButtons(spinButton, resetButton) {
        const isSpin = spinButton.style.display === "inline-block";
        if (isSpin) {
            resetButton.style.display = "inline-block";
            spinButton.style.display = "none";
        } else {
            spinButton.style.display = "inline-block";
            resetButton.style.display = "none";
        }
    }

    async function highlightElem(elem, durationMillis, isChosen) {
        elem.ref.style.transition = `transform ${durationMillis}ms ease, z-index 0s`; // Smooth transition for transform
        elem.ref.style.position = "relative";
        elem.ref.style.zIndex = "9999";
        elem.ref.style.transform = "scale(1.5)";

        if (!isChosen) {
            await sleep(durationMillis);
            await elem.restoreStyles(durationMillis)
        } else {
            elem.ref.style.transform = "rotate(360deg) scale(1.5)";
        }
    }

    async function spin(elems, chosenElemIndex) {
        if (!spinning) {
            spinning = true;

            const allElems = elems.slice(0, chosenElemIndex + 1)
            while (allElems.length < 40) {
                allElems.unshift(...elems)
            }

            for (let i = 0; i < allElems.length && spinning; i++) {
                const duration = durationForIndex(allElems.length, i);
                const isChosen = i === allElems.length - 1;
                await highlightElem(allElems[i], duration, isChosen);
                if (isChosen) elems[chosenElemIndex].previouslySelected = true;
            }
            spinning = false;
        }
    }

    function extractStudent(elem) {
        const style = {
            transition: elem.style.transition,
            transform: elem.style.transform,
            zIndex: elem.style.zIndex,
            position: elem.style.position
        }

        async function restoreStyles(durationMillis) {
            elem.style.transform = style.transform;
            elem.style.position = style.position;
            if (durationMillis !== 0) await sleep(durationMillis)
            elem.style.transition = style.transition;
            elem.style.zIndex = style.zIndex;
        }

        const obj = {
            ref: elem,
            previouslySelected: false,
            participating: () => elem.querySelector(".icon-cr-status-absent") === null && !obj.previouslySelected,
            restoreStyles: restoreStyles
        }
        return obj;
    }

    async function chooseStudentAndSpin() {
        if (participating.length > 0) {
            participating = participating.filter(e => e.participating())
            const chosenNum = Math.floor(Math.random() * participating.length);
            toggleButtons(spinButton, resetButton);
            await spin(participating, chosenNum);
        }
    }

    async function stopSpinningAndRestoreStyles() {
        spinning = false;
        for (const student of students) {
            await student.restoreStyles(0)
        }
        toggleButtons(spinButton, resetButton);
    }

    spinButton.id = id;
    [[spinButton, "wheel"], [resetButton, "stop"]].forEach(([button, iconName]) => {
        button.style.display = "none";
        button.classList.add("icon-cr-settings", "imageButton");
        const icon = document.createElement("div")
        icon.classList.add("icon", "icon-cr-settings");
        const iconUrl = runtime.getURL(`icons/${iconName}.svg`);
        icon.style.backgroundImage = "url(" + iconUrl + ")";
        icon.style.backgroundSize = "contain";
        button.appendChild(icon);
    })
    resetButton.addEventListener("click", stopSpinningAndRestoreStyles)
    spinButton.addEventListener("click", chooseStudentAndSpin);
    menuNode.prepend(spinButton, resetButton);
    spinButton.style.display = "inline-block";
    console.log("buttons created");
}

new MutationObserver(() => {
    const iframe = document.querySelector("#wu-page-iframe");
    if (iframe) {
        iframe.addEventListener("load", () => {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const iframeObserver = new MutationObserver(() => {

                const studentNodes = iframeDoc.querySelectorAll(".studentCard__container");
                const menuNode = iframeDoc.getElementById("classregPageForm.quickSettings");

                if (studentNodes.length > 0 && menuNode && !menuNode.querySelector(`#${id}`)) {
                    console.log("init app")
                    initExtensionFunctionality(iframeDoc, studentNodes, menuNode);
                    iframeObserver.disconnect();
                }
            })
            iframeObserver.observe(iframeDoc.body, {childList: true, subtree: true});
        });
    }
}).observe(document.body, {childList: true, subtree: true});

/*elem.querySelector(".studentCard__firstName").textContent = "Max";
elem.querySelector(".studentCard__lastName").textContent = "Mustermann";
console.log(
elem.querySelector(".studentCard__image").style.display = "none" // = "https://content.webuntis.com/WebUntis/static/2025.8.3/Images/avatar-default-white.png"
)*/
