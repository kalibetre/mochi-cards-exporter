export const hideTagFromPreview = (state: boolean, tagName: string) => {
    if(state && document.getElementById("mochi-card-style") == null){
        const style = document.createElement("style");
        style.id = "mochi-card-style";
    
        style.innerHTML = `
            .tag[href="#${tagName}"]{
                display: none;
            }
        `;
    
        document.head.appendChild(style);
    }
    else if (!state) {
        document.getElementById("mochi-card-style")?.remove();
    }
}