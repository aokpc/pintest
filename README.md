# pintest

arduino系ボードのピンの入出力をリアルタイムで見ることができます

1. pintest.inoをボードに書き込み
2. `python serial2ws.py`
3. index.htmlを開く

# 通信

PIN(5bit 0-30)+MODE(3bit 0-7)

```
000 D_OUT_LOW
001 D_OUT_HIGH
010 D_IN        RES 0|1
011 D_IN_PUP    RES 0|1
100 PWM     VALUE 0-255
101 ADC         RES (0-1023)/4
110 servoA  VALUE 0-180
111 servoB  VALUE 0-180
```

255 255 リセット

送信ブロック(2byte)

```hex
PIN+MODE:VALUE|0 PIN+MODE:VALUE|0 PIN+MODE:VALUE|0 ... 255 255
```

受信ブロック(2byte)

```hex
PIN+MODE:RES|VALUE PIN+MODE:RES|VALUE PIN+MODE:RES|VALUE ... 255 255
```
