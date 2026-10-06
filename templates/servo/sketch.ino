// Servo con LEDC — ESP32 Studio
const int SERVO_PIN = 18;

void writeAngle(int deg) {
  // 0.5 ms a 2.5 ms dentro de un periodo de 20 ms (14 bits)
  int us = map(deg, 0, 180, 500, 2500);
  ledcWrite(SERVO_PIN, (uint32_t)us * 16383 / 20000);
}

void setup() {
  Serial.begin(115200);
  ledcAttach(SERVO_PIN, 50, 14);
}

void loop() {
  for (int a = 0; a <= 180; a += 10) { writeAngle(a); Serial.printf("angulo:%d\n", a); delay(100); }
  for (int a = 180; a >= 0; a -= 10) { writeAngle(a); Serial.printf("angulo:%d\n", a); delay(100); }
}
