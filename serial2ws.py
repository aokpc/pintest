import serial.tools.list_ports
import serial, threading, time, asyncio, subprocess
import websockets, websockets.asyncio.server


ports = serial.tools.list_ports.comports()
devices = [info.device for info in ports]
arduino = serial.Serial(devices[-1], 115200, timeout=0)
print(devices[-1])
client: websockets.asyncio.server.ServerConnection = None


async def pipe():
    try:
        while client.state:
            time.sleep(0.05)
            buffer = arduino.read(1024)
            if len(buffer):
                print([*buffer])
                await client.send(buffer, False)
    except Exception as e:
        print("E!", e)


def piperun():
    asyncio.run(pipe())


async def serve(websocket: websockets.asyncio.server.ServerConnection):
    global client
    client = websocket
    threading.Thread(target=piperun, args=[]).start()
    async for message in websocket:
        if type(message) == str:
            arduino.write(message.encode())
        else:
            arduino.write(message)


async def main():
    async with websockets.serve(serve, "localhost", 8090):
        await asyncio.Future()


subprocess.call(["open", "./index.html"])
asyncio.run(main())
