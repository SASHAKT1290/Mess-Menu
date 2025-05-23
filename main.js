"use strict";

// User configuration
var dailyItems = {
    B: [
        "Tea + Coffee",
        "Boiled Egg / Omelette",
        "Bread + Butter + Jam",
        "Bournvita",
        "Hot + Cold Milk",
        "Cornflakes",
    ],
    L: [],
    S: ["Tea + Coffee"],
    D: [],
};

// Global variables
let selectedDate = new Date();
let menu = null;

function setupPWABanner() {
    document.querySelector(".pwa-install-banner").style.display = "block";
    const ua = navigator.userAgent;
    let install_text = "";
    if (
        [
            "iPad Simulator",
            "iPhone Simulator",
            "iPod Simulator",
            "iPad",
            "iPhone",
            "iPod",
        ].includes(navigator.platform)
    ) {
        // iOS + not Safari
        install_text = "[In Safari] Share → Add to Home Screen";
    } else if (ua.match(/edg/i)) {
        // Edge
        install_text = "Options (≡) → Add to phone";
    } else if (ua.match(/samsungbrowser/i)) {
        // Fkin Samsung Internet
        install_text = "Click on the download button (near the URL)";
    } else if (ua.match(/chrome|chromium|crios/i)) {
        // Chrome
        install_text = "Options (⋮) → Install App";
    } else if (ua.match(/firefox|fxios/i)) {
        // Firefox
        install_text = "Options (⋮) → Install App";
    } else if (ua.match(/opr\//i)) {
        // Opera
        install_text = "Options (⋮) → Install App";
    } else {
        // Unknown / Unsupported Browser
        install_text = "Options → Install App";
    }

    document.querySelector("#pwa-install-instructions").innerText =
        install_text;
}

/**
 * Make the document jump to a day's meal based on the current time.
 */
function jumpToMenuPosition() {
    // TODO: Meal times shouldn't be hardcoded

    // Jump to the current time in the day
    const current_hours = new Date().getHours();
    let scrollAmt = -document.querySelector(".day-picker").offsetHeight;
    if (current_hours < 10) {
        // Already at #B
    } else if (current_hours < 14) {
        // Jump to #L
        scrollAmt += document.querySelector("#L").offsetTop;
    } else if (current_hours < 18) {
        // Jump to #S
        scrollAmt += document.querySelector("#S").offsetTop;
    } else if (current_hours < 22) {
        // Jump to #D
        scrollAmt += document.querySelector("#D").offsetTop;
    }
    document.querySelector("#actual-menu").scrollTo(0, scrollAmt);
}

/**
 * Asynchronously load the menu, and update the UI accordingly.
 */
async function loadMenu() {
    menu = await fetch("./menu.json").then((res) => res.json());
    addDailyItemsToMenu();
    initializeMenuUI(new Date());
    jumpToMenuPosition();
}

// Immediately invoked setup function
(async function setup() {
    loadMenu();

    // PWA Analytics
    if (
        navigator.standalone === true ||
        window.matchMedia("(display-mode: standalone)").matches
    ) {
        gtag("event", "pwa_use", {
            event_category: "engagement",
            value: 1,
        });
    } else {
        setupPWABanner();
    }

    // Update the date picker
    const currentDateIndicator = document.querySelector(".day-picker--current");
    currentDateIndicator.innerHTML = getPrettyDateString(new Date());

    // Setup the day navigation buttons
    document.querySelector(".day-picker--prev").onclick = () => {
        if ("vibrate" in navigator) navigator.vibrate(50);
        selectedDate = addDays(selectedDate, -1);
        initializeMenuUI(selectedDate);
    };
    document.querySelector(".day-picker--next").onclick = () => {
        if ("vibrate" in navigator) navigator.vibrate(50);
        selectedDate = addDays(selectedDate, +1);
        initializeMenuUI(selectedDate);
    };

    // Add event listener to the date picker
    const inputElementDate = document.querySelector("#input--date");
    inputElementDate.addEventListener("change", (event) => {
        selectedDate = new Date(inputElementDate.value);
        initializeMenuUI(selectedDate);
    });
    document.querySelector(".day-picker--current").onclick = (event) => {
        const hiddenInput = document.querySelector("#input--date");
        hiddenInput.showPicker();
    };
})();

/**
 * Update the menu shown on screen for the given date.
 *
 * @param {Date} date
 */
function initializeMenuUI(date) {
    const menuOTD = getMenuOTD(date);

    // Update the date picker
    const currentDateIndicator = document.querySelector(".day-picker--current");
    currentDateIndicator.innerHTML = getPrettyDateString(date);

    // Update the menu
    for (let [mealName, mealItems] of Object.entries(menuOTD)) {
        const variableItems = mealItems[0];
        const everydayItems = mealItems[1];
        document
            .getElementById(mealName)
            .querySelector(".menu__items").innerHTML = [
            ...variableItems.map(variableItemHTML),
            ...everydayItems.map(everydayItemHTML),
        ].join("");
    }
}

function variableItemHTML(item_name) {
    return `<div class="menu__item menu__item--variable">${item_name}</div>`;
}

function everydayItemHTML(item_name) {
    return `<div class="menu__item menu__item--everyday">${item_name}</div>`;
}

/**
 * @param {Date} chosenDate
 */
function getMenuOTD(chosenDate) {
    const startDateDawn = new Date(menu["start"]);

    // Make sure the date starts at dawn
    chosenDate.setHours(0, 0, 0, 0);
    if (chosenDate < startDateDawn) chosenDate = startDateDawn;

    // Initialize the counter (to count till chosenDate)
    let counterDate = startDateDawn;
    let counterIsSunday = counterDate.getDay() === 0;
    let rotationIndex = 0;
    if (counterIsSunday) {
        rotationIndex = -1;
    } else {
        rotationIndex = 0;
    }

    // Count till chosenDate
    while (counterDate < chosenDate) {
        counterDate = addDays(counterDate, 1);
        counterIsSunday = counterDate.getDay() === 0;

        if (!counterIsSunday) {
            // mod by 9 because of the stupid 9+1 system
            rotationIndex = (rotationIndex + 1) % 9;
        }
    }

    if (counterIsSunday) {
        // Sunday
        return menu["menu"]["sunday"];
    } else {
        // Normal day in the rotation
        return menu["menu"]["rotation"]["D" + (rotationIndex + 1)];
    }
}

/**
 * @param {Date} date
 */
function getPrettyDateString(date) {
    const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const MONTHS = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "June",
        "July",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];
    const monthIndex = date.getMonth();
    const monthStr = MONTHS[monthIndex];
    return `${DAYS[date.getDay()]}, ${monthStr} ${date.getDate()}`;
}

/**
 * Add daily items to each the meal items of each meal in the menu.
 * Modifies the menu in-place.
 */
function addDailyItemsToMenu() {
    const actualMenu = menu["menu"];

    // For rotations
    const rotationMenus = Object.values(actualMenu["rotation"]);
    rotationMenus.forEach((menuEntries) => {
        // menuEntries = { "B": [], ... }
        for (let [mealName, items] of Object.entries(menuEntries)) {
            let variable_items = items;
            let dailyItemsForMeal = dailyItems[mealName];

            menuEntries[mealName] = [variable_items, dailyItemsForMeal];
        }
    });

    // For sunday
    for (let [mealName, items] of Object.entries(actualMenu["sunday"])) {
        let variable_items = items;
        let dailyItemsForMeal = dailyItems[mealName];

        actualMenu["sunday"][mealName] = [variable_items, dailyItemsForMeal];
    }
}

/**
 * @param {Date} date
 * @param {number} numDays
 * @returns {Date}
 */
function addDays(date, numDays) {
    const oneDayMs = 1000 * 60 * 60 * 24;
    return new Date(date.getTime() + oneDayMs * numDays);
}
