// Datos de referencia: placas, pinouts, catálogo de componentes de simulación y snippets.

const DEFAULT_BOARDS = [
  { name: 'ESP32 Dev Module (DevKitC / WROOM-32)', fqbn: 'esp32:esp32:esp32' },
  { name: 'ESP32 Wrover Module', fqbn: 'esp32:esp32:esp32wrover' },
  { name: 'ESP32-S2 Dev Module', fqbn: 'esp32:esp32:esp32s2' },
  { name: 'ESP32-S3 Dev Module', fqbn: 'esp32:esp32:esp32s3' },
  { name: 'ESP32-C3 Dev Module', fqbn: 'esp32:esp32:esp32c3' },
  { name: 'ESP32-C6 Dev Module', fqbn: 'esp32:esp32:esp32c6' },
  { name: 'ESP32-H2 Dev Module', fqbn: 'esp32:esp32:esp32h2' },
  { name: 'AI Thinker ESP32-CAM', fqbn: 'esp32:esp32:esp32cam' },
  { name: 'NodeMCU-32S', fqbn: 'esp32:esp32:nodemcu-32s' },
  { name: 'WEMOS LOLIN32', fqbn: 'esp32:esp32:lolin32' },
  { name: 'DOIT ESP32 DEVKIT V1', fqbn: 'esp32:esp32:esp32doit-devkit-v1' }
];

// tags: adc, touch, dac, pwm, i2c, spi, uart, strap, input, flash, usb, led, jtag
const PINOUTS = {
  esp32: {
    note: 'ADC2 no funciona mientras el Wi‑Fi está activo. GPIO6–11 están conectados a la flash interna.',
    pins: [
      [0, 'ADC2_CH1 · TOUCH1 · BOOT', ['adc', 'touch', 'pwm', 'strap'], 'Debe estar en ALTO al arrancar; en BAJO entra en modo descarga.'],
      [1, 'U0TXD', ['uart'], 'TX del puerto serie de programación/monitor.'],
      [2, 'ADC2_CH2 · TOUCH2 · LED', ['adc', 'touch', 'pwm', 'strap', 'led'], 'LED integrado en muchas placas. Debe quedar flotante/BAJO para descargar.'],
      [3, 'U0RXD', ['uart'], 'RX del puerto serie de programación.'],
      [4, 'ADC2_CH0 · TOUCH0', ['adc', 'touch', 'pwm'], 'Uso general.'],
      [5, 'VSPI SS', ['spi', 'pwm', 'strap'], 'Emite PWM al arrancar.'],
      [6, 'FLASH CLK', ['flash'], 'No usar.'], [7, 'FLASH D0', ['flash'], 'No usar.'], [8, 'FLASH D1', ['flash'], 'No usar.'],
      [9, 'FLASH D2', ['flash'], 'No usar.'], [10, 'FLASH D3', ['flash'], 'No usar.'], [11, 'FLASH CMD', ['flash'], 'No usar.'],
      [12, 'ADC2_CH5 · TOUCH5 · HSPI MISO', ['adc', 'touch', 'pwm', 'spi', 'strap'], 'Define el voltaje de la flash: debe estar en BAJO al arrancar.'],
      [13, 'ADC2_CH4 · TOUCH4 · HSPI MOSI', ['adc', 'touch', 'pwm', 'spi'], 'Uso general.'],
      [14, 'ADC2_CH6 · TOUCH6 · HSPI CLK', ['adc', 'touch', 'pwm', 'spi'], 'Emite PWM al arrancar.'],
      [15, 'ADC2_CH3 · TOUCH3 · HSPI SS', ['adc', 'touch', 'pwm', 'spi', 'strap'], 'Silencia el log de arranque si está en BAJO.'],
      [16, 'U2RXD', ['uart', 'pwm'], 'No disponible en módulos WROVER (PSRAM).'],
      [17, 'U2TXD', ['uart', 'pwm'], 'No disponible en módulos WROVER (PSRAM).'],
      [18, 'VSPI SCK', ['spi', 'pwm'], 'Uso general.'],
      [19, 'VSPI MISO', ['spi', 'pwm'], 'Uso general.'],
      [21, 'I2C SDA', ['i2c', 'pwm'], 'SDA por defecto de Wire.'],
      [22, 'I2C SCL', ['i2c', 'pwm'], 'SCL por defecto de Wire.'],
      [23, 'VSPI MOSI', ['spi', 'pwm'], 'Uso general.'],
      [25, 'DAC1 · ADC2_CH8', ['dac', 'adc', 'pwm'], 'Salida analógica real de 8 bits.'],
      [26, 'DAC2 · ADC2_CH9', ['dac', 'adc', 'pwm'], 'Salida analógica real de 8 bits.'],
      [27, 'ADC2_CH7 · TOUCH7', ['adc', 'touch', 'pwm'], 'Uso general.'],
      [32, 'ADC1_CH4 · TOUCH9 · XTAL32P', ['adc', 'touch', 'pwm'], 'ADC1: funciona con Wi‑Fi activo.'],
      [33, 'ADC1_CH5 · TOUCH8 · XTAL32N', ['adc', 'touch', 'pwm'], 'ADC1: funciona con Wi‑Fi activo.'],
      [34, 'ADC1_CH6', ['adc', 'input'], 'Solo entrada, sin pull-up/pull-down.'],
      [35, 'ADC1_CH7', ['adc', 'input'], 'Solo entrada, sin pull-up/pull-down.'],
      [36, 'ADC1_CH0 · SENSOR_VP', ['adc', 'input'], 'Solo entrada, sin pull-up/pull-down.'],
      [39, 'ADC1_CH3 · SENSOR_VN', ['adc', 'input'], 'Solo entrada, sin pull-up/pull-down.']
    ]
  },
  esp32s3: {
    note: 'GPIO26–32 están conectados a la flash; GPIO33–37 a la PSRAM octal en módulos R8/N8R8.',
    pins: [
      [0, 'BOOT', ['strap', 'pwm'], 'Botón BOOT. En BAJO al arrancar = modo descarga.'],
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((g) => [g, `ADC1_CH${g - 1} · TOUCH${g}${g === 8 ? ' · I2C SDA' : g === 9 ? ' · I2C SCL' : g === 10 ? ' · SPI SS' : ''}`, ['adc', 'touch', 'pwm', ...(g === 8 || g === 9 ? ['i2c'] : []), ...(g === 10 ? ['spi'] : []), ...(g === 3 ? ['strap'] : [])], g === 3 ? 'Strapping (fuente JTAG).' : 'Uso general.']),
      [11, 'ADC2_CH0 · TOUCH11 · SPI MOSI', ['adc', 'touch', 'pwm', 'spi'], 'ADC2 no disponible con Wi‑Fi.'],
      [12, 'ADC2_CH1 · TOUCH12 · SPI SCK', ['adc', 'touch', 'pwm', 'spi'], 'ADC2 no disponible con Wi‑Fi.'],
      [13, 'ADC2_CH2 · TOUCH13 · SPI MISO', ['adc', 'touch', 'pwm', 'spi'], 'ADC2 no disponible con Wi‑Fi.'],
      [14, 'ADC2_CH3 · TOUCH14', ['adc', 'touch', 'pwm'], 'Uso general.'],
      [15, 'ADC2_CH4 · XTAL32P', ['adc', 'pwm'], 'Uso general.'],
      [16, 'ADC2_CH5 · XTAL32N', ['adc', 'pwm'], 'Uso general.'],
      [17, 'ADC2_CH6 · U1TXD', ['adc', 'pwm', 'uart'], 'Uso general.'],
      [18, 'ADC2_CH7 · U1RXD', ['adc', 'pwm', 'uart'], 'Uso general.'],
      [19, 'USB D−', ['usb', 'adc'], 'USB nativo (CDC/JTAG).'],
      [20, 'USB D+', ['usb', 'adc'], 'USB nativo (CDC/JTAG).'],
      [21, 'GPIO21', ['pwm'], 'Uso general.'],
      [35, 'GPIO35', ['pwm'], 'Ocupado por PSRAM octal en algunos módulos.'],
      [36, 'GPIO36', ['pwm'], 'Ocupado por PSRAM octal en algunos módulos.'],
      [37, 'GPIO37', ['pwm'], 'Ocupado por PSRAM octal en algunos módulos.'],
      [38, 'GPIO38 · RGB LED (v1.1)', ['pwm', 'led'], 'LED RGB en DevKitC-1 v1.1.'],
      [39, 'MTCK', ['jtag', 'pwm'], 'JTAG.'], [40, 'MTDO', ['jtag', 'pwm'], 'JTAG.'], [41, 'MTDI', ['jtag', 'pwm'], 'JTAG.'], [42, 'MTMS', ['jtag', 'pwm'], 'JTAG.'],
      [43, 'U0TXD', ['uart'], 'TX del puerto serie de programación.'],
      [44, 'U0RXD', ['uart'], 'RX del puerto serie de programación.'],
      [45, 'VDD_SPI', ['strap', 'pwm'], 'Strapping: voltaje de la flash.'],
      [46, 'ROM log', ['strap', 'pwm'], 'Strapping. Debe estar en BAJO para descargar.'],
      [47, 'GPIO47', ['pwm'], 'Uso general.'],
      [48, 'GPIO48 · RGB LED (v1.0)', ['pwm', 'led'], 'LED RGB en DevKitC-1 v1.0.']
    ]
  },
  esp32c3: {
    note: 'GPIO12–17 están conectados a la flash SPI. ADC2 (GPIO5) no es fiable con Wi‑Fi.',
    pins: [
      [0, 'ADC1_CH0 · XTAL32P', ['adc', 'pwm'], 'Uso general.'],
      [1, 'ADC1_CH1 · XTAL32N', ['adc', 'pwm'], 'Uso general.'],
      [2, 'ADC1_CH2', ['adc', 'pwm', 'strap'], 'Strapping: debe estar en ALTO al arrancar.'],
      [3, 'ADC1_CH3', ['adc', 'pwm'], 'Uso general.'],
      [4, 'ADC1_CH4 · SPI SCK · MTMS', ['adc', 'pwm', 'spi', 'jtag'], 'Uso general.'],
      [5, 'ADC2_CH0 · SPI MISO · MTDI', ['adc', 'pwm', 'spi', 'jtag'], 'Uso general.'],
      [6, 'SPI MOSI · MTCK', ['pwm', 'spi', 'jtag'], 'Uso general.'],
      [7, 'SPI SS · MTDO', ['pwm', 'spi', 'jtag'], 'Uso general.'],
      [8, 'I2C SDA · RGB LED', ['pwm', 'i2c', 'strap', 'led'], 'Strapping. LED RGB en DevKitM-1.'],
      [9, 'I2C SCL · BOOT', ['pwm', 'i2c', 'strap'], 'Botón BOOT. En BAJO al arrancar = modo descarga.'],
      [10, 'GPIO10', ['pwm'], 'Uso general.'],
      [18, 'USB D−', ['usb', 'pwm'], 'USB nativo (CDC/JTAG).'],
      [19, 'USB D+', ['usb', 'pwm'], 'USB nativo (CDC/JTAG).'],
      [20, 'U0RXD', ['uart', 'pwm'], 'RX del puerto serie de programación.'],
      [21, 'U0TXD', ['uart', 'pwm'], 'TX del puerto serie de programación.']
    ]
  }
};

const PIN_TAGS = {
  adc: 'ADC', touch: 'Touch', dac: 'DAC', pwm: 'PWM', i2c: 'I2C', spi: 'SPI', uart: 'UART',
  strap: 'Strapping', input: 'Solo entrada', flash: 'Flash', usb: 'USB', led: 'LED', jtag: 'JTAG'
};

// Catálogo de componentes Wokwi para el diseñador de circuitos
const WOKWI_PARTS = [
  { type: 'wokwi-led', name: 'LED', prefix: 'led', pins: ['A', 'C'], attrs: { color: 'red' }, hint: { A: 'GPIO', C: 'GND' } },
  { type: 'wokwi-rgb-led', name: 'LED RGB', prefix: 'rgb', pins: ['R', 'G', 'B', 'COM'], attrs: { common: 'cathode' }, hint: { COM: 'GND' } },
  { type: 'wokwi-resistor', name: 'Resistencia', prefix: 'r', pins: ['1', '2'], attrs: { value: '220' } },
  { type: 'wokwi-pushbutton', name: 'Pulsador', prefix: 'btn', pins: ['1.l', '2.l'], attrs: { color: 'green' }, hint: { '1.l': 'GPIO', '2.l': 'GND' } },
  { type: 'wokwi-slide-switch', name: 'Interruptor', prefix: 'sw', pins: ['1', '2', '3'], attrs: {} },
  { type: 'wokwi-potentiometer', name: 'Potenciómetro', prefix: 'pot', pins: ['VCC', 'SIG', 'GND'], attrs: {}, hint: { VCC: '3V3', GND: 'GND' } },
  { type: 'wokwi-photoresistor-sensor', name: 'Sensor de luz (LDR)', prefix: 'ldr', pins: ['VCC', 'GND', 'AO', 'DO'], attrs: {}, hint: { VCC: '3V3', GND: 'GND' } },
  { type: 'wokwi-dht22', name: 'DHT22 (temp./humedad)', prefix: 'dht', pins: ['VCC', 'SDA', 'GND'], attrs: {}, hint: { VCC: '3V3', GND: 'GND' } },
  { type: 'wokwi-ds18b20', name: 'DS18B20 (temperatura)', prefix: 'ds', pins: ['VCC', 'DQ', 'GND'], attrs: {}, hint: { VCC: '3V3', GND: 'GND' } },
  { type: 'wokwi-mpu6050', name: 'MPU6050 (IMU)', prefix: 'imu', pins: ['VCC', 'GND', 'SCL', 'SDA'], attrs: {}, hint: { VCC: '3V3', GND: 'GND', SCL: '22', SDA: '21' } },
  { type: 'wokwi-hc-sr04', name: 'HC-SR04 (ultrasonido)', prefix: 'sonar', pins: ['VCC', 'TRIG', 'ECHO', 'GND'], attrs: {}, hint: { VCC: '5V', GND: 'GND' } },
  { type: 'wokwi-pir-motion-sensor', name: 'Sensor PIR', prefix: 'pir', pins: ['VCC', 'OUT', 'GND'], attrs: {}, hint: { VCC: '5V', GND: 'GND' } },
  { type: 'board-ssd1306', name: 'OLED SSD1306 (I2C)', prefix: 'oled', pins: ['GND', 'VCC', 'SCL', 'SDA'], attrs: {}, hint: { VCC: '3V3', GND: 'GND', SCL: '22', SDA: '21' } },
  { type: 'wokwi-lcd1602', name: 'LCD 16x2 (I2C)', prefix: 'lcd', pins: ['GND', 'VCC', 'SDA', 'SCL'], attrs: { pins: 'i2c' }, hint: { VCC: '5V', GND: 'GND', SCL: '22', SDA: '21' } },
  { type: 'wokwi-servo', name: 'Servo', prefix: 'servo', pins: ['GND', 'V+', 'PWM'], attrs: {}, hint: { 'V+': '5V', GND: 'GND' } },
  { type: 'wokwi-buzzer', name: 'Buzzer', prefix: 'bz', pins: ['1', '2'], attrs: { volume: '0.1' }, hint: { 1: 'GND' } },
  { type: 'wokwi-relay-module', name: 'Módulo relé', prefix: 'relay', pins: ['VCC', 'GND', 'IN'], attrs: {}, hint: { VCC: '5V', GND: 'GND' } },
  { type: 'wokwi-neopixel', name: 'NeoPixel (WS2812)', prefix: 'np', pins: ['VDD', 'VSS', 'DIN'], attrs: {}, hint: { VDD: '5V', VSS: 'GND' } },
  { type: 'wokwi-led-ring', name: 'Anillo NeoPixel', prefix: 'ring', pins: ['VCC', 'GND', 'DIN'], attrs: { pixels: '16' }, hint: { VCC: '5V', GND: 'GND' } },
  { type: 'wokwi-ntc-temperature-sensor', name: 'Termistor NTC', prefix: 'ntc', pins: ['VCC', 'OUT', 'GND'], attrs: {}, hint: { VCC: '3V3', GND: 'GND' } },
  { type: 'wokwi-analog-joystick', name: 'Joystick', prefix: 'joy', pins: ['VCC', 'VERT', 'HORZ', 'SEL', 'GND'], attrs: {}, hint: { VCC: '3V3', GND: 'GND' } },
  { type: 'wokwi-membrane-keypad', name: 'Teclado 4x4', prefix: 'keypad', pins: ['R1', 'R2', 'R3', 'R4', 'C1', 'C2', 'C3', 'C4'], attrs: {} },
  { type: 'wokwi-microsd-card', name: 'Tarjeta microSD', prefix: 'sd', pins: ['CD', 'DO', 'GND', 'SCK', 'VCC', 'DI', 'CS'], attrs: {}, hint: { VCC: '3V3', GND: 'GND' } },
  { type: 'wokwi-ili9341', name: 'Pantalla TFT ILI9341', prefix: 'tft', pins: ['VCC', 'GND', 'CS', 'RST', 'D/C', 'MOSI', 'SCK', 'LED', 'MISO'], attrs: {}, hint: { VCC: '3V3', GND: 'GND', LED: '3V3' } }
];

// Pines de la placa disponibles en Wokwi
const WOKWI_BOARD_PINS = {
  esp32: ['2', '4', '5', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '23', '25', '26', '27', '32', '33', '34', '35', 'VP', 'VN', '0', 'TX', 'RX', '3V3', '5V', 'GND.1', 'GND.2', 'GND.3', 'EN'],
  esp32s3: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '21', '35', '36', '37', '38', '39', '40', '41', '42', '45', '46', '47', '48', '0', 'TX', 'RX', '3V3.1', '3V3.2', '5V', 'GND.1', 'GND.2', 'GND.3', 'RST'],
  esp32c3: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '18', '19', '20', '21', 'TX', 'RX', '3V3.1', '3V3.2', '5V.1', '5V.2', 'GND.1', 'GND.2', 'GND.3', 'GND.4', 'RST'],
  esp32s2: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '21', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '45', '0', 'TX', 'RX', '3V3', '5V', 'GND.1', 'GND.2'],
  esp32c6: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '15', '18', '19', '20', '21', '22', '23', 'TX', 'RX', '3V3', '5V', 'GND.1', 'GND.2'],
  esp32h2: ['0', '1', '2', '3', '4', '5', '8', '9', '10', '11', '12', '13', '14', '22', '25', '26', '27', 'TX', 'RX', '3V3', '5V', 'GND.1', 'GND.2']
};

// Fragmentos de código para autocompletado (Arduino + ESP32)
const SNIPPETS = [
  ['setup/loop', 'Estructura básica de un sketch', 'void setup() {\n\tSerial.begin(115200);\n\t$0\n}\n\nvoid loop() {\n\t\n}'],
  ['Serial.begin', 'Inicia el puerto serie', 'Serial.begin(${1:115200});'],
  ['Serial.println', 'Imprime una línea', 'Serial.println(${1:"texto"});'],
  ['Serial.printf', 'Imprime con formato', 'Serial.printf("${1:%d}\\n", ${2:valor});'],
  ['pinMode', 'Configura un pin', 'pinMode(${1:pin}, ${2|OUTPUT,INPUT,INPUT_PULLUP,INPUT_PULLDOWN|});'],
  ['digitalWrite', 'Escribe un pin digital', 'digitalWrite(${1:pin}, ${2|HIGH,LOW|});'],
  ['digitalRead', 'Lee un pin digital', 'digitalRead(${1:pin})'],
  ['analogRead', 'Lee el ADC (0-4095)', 'analogRead(${1:pin})'],
  ['analogReadMilliVolts', 'Lee el ADC calibrado en mV', 'analogReadMilliVolts(${1:pin})'],
  ['analogWrite', 'PWM simple', 'analogWrite(${1:pin}, ${2:128});'],
  ['ledcAttach', 'PWM LEDC (núcleo 3.x)', 'ledcAttach(${1:pin}, ${2:5000}, ${3:8});'],
  ['ledcWrite', 'Ciclo de trabajo PWM', 'ledcWrite(${1:pin}, ${2:duty});'],
  ['dacWrite', 'Salida DAC (GPIO25/26)', 'dacWrite(${1:25}, ${2:128});'],
  ['touchRead', 'Lee un pin táctil', 'touchRead(${1:T0})'],
  ['attachInterrupt', 'Interrupción por pin', 'attachInterrupt(digitalPinToInterrupt(${1:pin}), ${2:isr}, ${3|RISING,FALLING,CHANGE|});'],
  ['IRAM_ATTR isr', 'Rutina de interrupción', 'void IRAM_ATTR ${1:isr}() {\n\t$0\n}'],
  ['millis timer', 'Temporizador no bloqueante', 'static unsigned long ${1:last} = 0;\nif (millis() - ${1:last} >= ${2:1000}) {\n\t${1:last} = millis();\n\t$0\n}'],
  ['WiFi.begin', 'Conectar a Wi‑Fi (estación)', 'WiFi.mode(WIFI_STA);\nWiFi.begin("${1:SSID}", "${2:PASSWORD}");\nwhile (WiFi.status() != WL_CONNECTED) {\n\tdelay(500);\n\tSerial.print(".");\n}\nSerial.println(WiFi.localIP());'],
  ['WiFi.softAP', 'Punto de acceso', 'WiFi.softAP("${1:ESP32-AP}", "${2:12345678}");\nSerial.println(WiFi.softAPIP());'],
  ['WebServer', 'Servidor web básico', '#include <WebServer.h>\nWebServer server(80);\n\nserver.on("/", []() {\n\tserver.send(200, "text/html", "${1:<h1>Hola ESP32</h1>}");\n});\nserver.begin();'],
  ['HTTPClient GET', 'Petición HTTP GET', 'HTTPClient http;\nhttp.begin("${1:http://example.com}");\nint code = http.GET();\nif (code > 0) Serial.println(http.getString());\nhttp.end();'],
  ['Preferences', 'Almacenamiento NVS', '#include <Preferences.h>\nPreferences prefs;\nprefs.begin("${1:app}", false);\nint ${2:valor} = prefs.getInt("${2:valor}", 0);\nprefs.putInt("${2:valor}", ${2:valor} + 1);\nprefs.end();'],
  ['xTaskCreatePinnedToCore', 'Tarea FreeRTOS en un núcleo', 'xTaskCreatePinnedToCore(${1:tarea}, "${1:tarea}", ${2:4096}, NULL, ${3:1}, NULL, ${4:1});'],
  ['task function', 'Función de tarea FreeRTOS', 'void ${1:tarea}(void *pv) {\n\tfor (;;) {\n\t\t$0\n\t\tvTaskDelay(pdMS_TO_TICKS(${2:1000}));\n\t}\n}'],
  ['vTaskDelay', 'Retardo FreeRTOS', 'vTaskDelay(pdMS_TO_TICKS(${1:100}));'],
  ['deep sleep timer', 'Dormir profundamente con temporizador', 'esp_sleep_enable_timer_wakeup(${1:10} * 1000000ULL);\nesp_deep_sleep_start();'],
  ['deep sleep ext0', 'Despertar por pin', 'esp_sleep_enable_ext0_wakeup(GPIO_NUM_${1:33}, ${2:1});\nesp_deep_sleep_start();'],
  ['Wire.begin', 'Inicia I2C', 'Wire.begin(${1:21}, ${2:22});'],
  ['I2C scanner', 'Escanear bus I2C', 'for (uint8_t a = 1; a < 127; a++) {\n\tWire.beginTransmission(a);\n\tif (Wire.endTransmission() == 0) Serial.printf("I2C 0x%02X\\n", a);\n}'],
  ['SPI.begin', 'Inicia SPI', 'SPI.begin(${1:18}, ${2:19}, ${3:23}, ${4:5});'],
  ['Serial2.begin', 'UART2 con pines', 'Serial2.begin(${1:9600}, SERIAL_8N1, ${2:16}, ${3:17});'],
  ['ESP.getFreeHeap', 'Memoria libre', 'ESP.getFreeHeap()'],
  ['esp_random', 'Número aleatorio por hardware', 'esp_random()'],
  ['temperatureRead', 'Temperatura interna', 'temperatureRead()'],
  ['BLE server', 'Servidor BLE básico', '#include <BLEDevice.h>\n#include <BLEServer.h>\n\nBLEDevice::init("${1:ESP32-BLE}");\nBLEServer *srv = BLEDevice::createServer();\nBLEService *svc = srv->createService("${2:4fafc201-1fb5-459e-8fcc-c5c9c331914b}");\nBLECharacteristic *ch = svc->createCharacteristic("${3:beb5483e-36e1-4688-b7f5-ea07361b26a8}", BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE);\nch->setValue("Hola");\nsvc->start();\nBLEDevice::getAdvertising()->start();'],
  ['ESP_LOGI', 'Log de ESP-IDF', 'ESP_LOGI("${1:TAG}", "${2:mensaje}");'],
  ['app_main', 'Punto de entrada ESP-IDF', 'void app_main(void)\n{\n\t$0\n}'],
  ['gpio_set_direction', 'GPIO ESP-IDF', 'gpio_reset_pin(GPIO_NUM_${1:2});\ngpio_set_direction(GPIO_NUM_${1:2}, GPIO_MODE_OUTPUT);'],
  ['plot', 'Salida para el plotter', 'Serial.printf("${1:a}:%f,${2:b}:%f\\n", ${3:v1}, ${4:v2});']
];
