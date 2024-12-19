uint8_t servoAB[4] = { 0, 0, 0, 0 };
uint8_t readType = 0;
uint8_t ffcount = 0;
uint8_t data[2] = { 0, 0 };

void setup() {
  Serial.begin(115200);
  while (true) {
    if (Serial.available()) {
      uint8_t input = Serial.read();
      if (input == 0xff) {
        ffcount++;
        if (ffcount >= 2) {
          readType = 0;
          if (ffcount == 2) {
            Serial.write(255);
            Serial.write(255);
          }
          continue;
        }
      } else {
        ffcount = 0;
      }
      data[readType] = input;
      if (readType == 1) {
        uint8_t pin_mode[2] = { 0, 0 };
        uint8_t value = data[1];
        parse(data[0], pin_mode);
        uint8_t res = set(pin_mode[0], pin_mode[1], value);
        Serial.write(data[0]);
        Serial.write(res);
        readType = 0;
      } else {
        readType = 1;
      }
    }
  }
}

void loop() {
}

// [pin,mode]
void parse(uint8_t i, uint8_t ret[2]) {
  ret[0] = i >> 3;
  ret[1] = i & 0b111;
}

uint8_t set(uint8_t pin, uint8_t mode, uint8_t value) {
  if (mode == 0b000) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, 0);
    return 0;
  } else if (mode == 0b001) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, 1);
    return 1;
  } else if (mode == 0b010) {
    pinMode(pin, INPUT);
    return digitalRead(pin);
  } else if (mode == 0b011) {
    pinMode(pin, INPUT_PULLUP);
    return digitalRead(pin);
  } else if (mode == 0b100) {
    analogWrite(pin, value);
    return value;
  } else if (mode == 0b101) {
    pinMode(pin, INPUT);
    return (analogRead(pin) / 4);
  }
}