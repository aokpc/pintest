/* うんこ */


function q(search: string): Element | null {
    return document.querySelector(search)
}


function c<K extends keyof HTMLElementTagNameMap>(name: K, property: Partial<HTMLElementTagNameMap[K]>, attr: Record<string, string | EventListenerOrEventListenerObject>): HTMLElementTagNameMap[K] {
    const dom = document.createElement(name)
            for (const key in property) {
                if (typeof property[key] !== "undefined" && typeof dom[key] !== "undefined") {
                    dom[key] = property[key];
                }
            }
            for (const key in attr) {
                if (key.startsWith("$") && typeof attr[key] == "function") {
                    dom.addEventListener(key.slice(1), attr[key])
                } else if (typeof attr[key] == "string") {
                    dom.setAttribute(key, attr[key])
                }
            }
            return dom
}
