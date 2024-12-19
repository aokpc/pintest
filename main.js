const pins = {
}
const input = q(".prompt")
let delay = 50
const ch = new Chart(q(".canvas"), {
    type: 'line',
    data: {
        labels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40].map(e => e * delay),
    },
    options: {
        scales: {
            yAxes: [{
                ticks: {
                    suggestedMax: 256,
                    suggestedMin: 0,
                    stepSize: 16,
                }
            }],
        },
        animation: false
    }
});
const modes = {
    0b000: "OUTPUT 0",
    0b001: "OUTPUT 1",
    0b010: "INPUT",
    0b011: "INPUT_PUP",
    0b100: "PWM",
    0b101: "ANALOG",
    0b110: "SERVO A",
    0b111: "SERVO B",
}

function setdelay() {
    prompt("間隔ms", delay).then(r => { delay = parseInt(r) })
}

function prompt(desc = "", text = "") {
    input.placeholder = desc
    input.value = text
    input.style.visibility = "visible"
    let resolve;
    let reject;
    const promise = new Promise((_resolve, _reject) => {
        resolve = _resolve
        reject = _reject
    })
    input.focus()
    input.onkeydown = (e) => {
        if (e.repeat) {
            return
        }
        if (e.key === "Enter") {
            const ret = parseInt(input.value)
            console.log(ret)
            if (Number.isNaN(ret)) {
                return
            }
            resolve(ret)
            input.style.visibility = ""
        } else if (e.key === "Escape") {
            reject()
            input.style.visibility = ""
        }
    }
    return promise
}


const setfuncs = {
    0b000: (isuser, pin) => { if (isuser) { pinMode(pin, 0b001); return 1 }; return 0 },
    0b001: (isuser, pin) => { if (isuser) { pinMode(pin, 0b000); return 0 }; return 1 },
    0b010: () => 0,
    0b011: () => 0,
    0b100: async () => parseInt(await prompt("PWMの値(0~255)", 128)),
    0b101: () => 0,
    0b110: async () => parseInt(await prompt("角度の値(0~180)", 90)),
    0b111: async () => parseInt(await prompt("角度の値(0~180)", 90)),
}

async function pin(pin = 0, mode = 0, value = 0) {
    const html = c(
        "div",
        {},
        {
            class: "pinView",
            "data-pin": pin.toString(),
            "data-mode": mode.toString(),
            "data-value": value.toString()
        }
    )
    html.appendChild(c("div", { innerText: pin.toString() }, { class: "pin" }))

    const modeElement = c("div", { innerText: modes[mode] }, {
        class: "mode"
    })
    const f = () => {
        modeElement.innerHTML = ""
        modeElement.removeEventListener("click", f)
        const select = c("select", {})
        for (const num in modes) {
            if (Object.prototype.hasOwnProperty.call(modes, num)) {
                select.appendChild(c("option", { value: num, innerText: modes[num] }))
            }
        }
        select.value = -1
        select.onchange = async () => {
            await pinMode(pin, parseInt(select.value))
            modeElement.addEventListener("click", f)
        }
        modeElement.appendChild(select)
    }
    modeElement.addEventListener("click", f)
    html.appendChild(modeElement)
    html.appendChild(c("div", {
        innerText: value.toString(),
        onclick: async () => {
            pins[pin].set = await setfuncs[pins[pin].mode](true, pin)
        }
    }, {
        class: "value"
    }))
    html.appendChild(c("div", { innerText: "" }, { class: "map" }))
    pins[pin] = { html, set: await setfuncs[mode](), mode, values: [] }
    return html
}

function pinValue(pin = 0, value = 0) {
    pins[pin].values.push(value)
    if (pins[pin].values.length > 41) {
        pins[pin].values.shift()
    }
    pins[pin].html.querySelector(".value").innerText = value
}

async function pinMode(pin = 0, mode = 0) {
    console.log(pin, mode)
    const modeElement = pins[pin].html.querySelector(".mode")
    modeElement.innerHTML = ""
    modeElement.innerText = modes[mode]
    pins[pin].set = await setfuncs[mode]()
    pins[pin].mode = mode
}

async function addPin() {
    const pinId = parseInt(await prompt("PIN番号"))
    if (pins[pinId] || Number.isNaN(pinId) || pinId > 30 || pinId < 0) {
        return
    }
    document.querySelector(".main").appendChild(await pin(pinId))
}

const ws = new WebSocket("ws://localhost:8090")
let recvBuff = []
let readBuff = [0, 0]
let readType = 0
let ffcount = 0
ws.binaryType = "arraybuffer"

ws.addEventListener("message", (e) => {
    let data = []
    if (e.data instanceof ArrayBuffer) {
        data = [...new Uint8Array(e.data)]
    } else if (typeof e.data === "string") {
        data = [...new TextDecoder().decode(e.data)]
    }
    recvBuff = [...recvBuff, ...data]
})

setInterval(() => {
    if (recvBuff.length) {
        const input = recvBuff.shift()
        if (input == 0xff) {
            ffcount++
            if (readType === 0) {
                return
            }
            if (ffcount >= 2) {
                readBuff = [0, 0]
                readType = 0
                return;
            }
        } else {
            ffcount = 0
        }
        readBuff[readType] = input
        if (readType) {
            const [pin_mode, value] = readBuff
            const [pin, mode] = parse(pin_mode)
            if (mode != pins[pin].mode) {
                console.error("pinMode", [pin, mode], pins[pin])
            }
            pinValue(pin, value)
            readType = 0
            readBuff = [0, 0]
        } else {
            readType = 1
        }
    }
}, 1)
const f = () => {
    const send = []
    const datas = []
    for (const pinId in pins) {
        if (Object.prototype.hasOwnProperty.call(pins, pinId)) {
            const { set, mode, values } = pins[pinId];
            send.push(add(pinId, mode), set)
            if (mode == 2 || mode == 3) {
                datas.push({ name: "pin " + pinId, data: values.map(e => e * 255) })
            } else if (mode == 5) {
                datas.push({ name: "pin " + pinId, data: values })
            }
        }
    }
    send.push(255, 255)
    ws.send(new Uint8Array(send))
    chart(datas)
    setTimeout(f, delay)
}
ws.onopen = () => setTimeout(f, delay)

function parse(pin_mode = 0) {
    const pin = pin_mode >> 3;
    const mode = pin_mode % 8;
    return [pin, mode]
}

function add(pin = 0, mode = 0) {
    return pin * 8 + mode
}

function chart(datas, colors = ["rgba(255,0,0,1)", "rgba(0,255,0,1)", "rgba(0,0,255,1)", "rgba(255,255,0,1)", "rgba(255,0,255,1)", "rgba(0,255,255,1)"]) {
    ch.data = {
        labels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40].map(e => e * delay),
        datasets: datas.map((e, i) => ({
            type: 'line',
            label: e.name || 'VALUE',
            data: e.data.toReversed(),
            borderColor: colors[i],
            backgroundColor: "rgba(255,0,0,0)",
        }))
    }
    ch.update();
}