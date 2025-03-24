// On page load, see if we have a saved theme in localStorage
function syncTheme() {
    const savedTheme = localStorage.getItem("theme");
    const defaultTheme = "arcanode";
    
    if (savedTheme) {
        document.documentElement.setAttribute("data-theme", savedTheme);
    }
    else
    {
        document.documentElement.setAttribute("data-theme", defaultTheme);
    }

    const themeSelects = document.querySelectorAll("select[onchange='changeTheme(this.value)']");
    themeSelects.forEach((selectEl) => {
        if (savedTheme) {
            selectEl.value = savedTheme;
        }
        else
        {
            selectEl.value = defaultTheme
        }
    });
}
function changeTheme(themeName) {
    console.log("Change theme to:", themeName);
    document.documentElement.setAttribute("data-theme", themeName);
    localStorage.setItem("theme", themeName);
}