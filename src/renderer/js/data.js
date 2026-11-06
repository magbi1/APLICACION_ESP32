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

// Referencia rápida: cada entrada es [nombre, descripción, código (sintaxis de snippet de Monaco), categoría].
// Se usa en el autocompletado del editor y en la vista «Referencia».
const SNIPPET_CATEGORIES = [
  'Estructura', 'Control de flujo', 'Variables y tipos', 'Funciones', 'Operadores', 'Matemáticas',
  'Entradas y salidas', 'Tiempo', 'Puerto serie', 'Cadenas de texto', 'Interrupciones',
  'Wi‑Fi y red', 'Bluetooth', 'FreeRTOS', 'Energía', 'Memoria y sistema', 'Buses (I2C, SPI, UART)', 'ESP-IDF'
];

const SNIPPETS = [
  // ---------- Estructura ----------
  ['setup/loop', 'Estructura básica de un sketch: setup() se ejecuta una vez y loop() se repite sin parar.', 'void setup() {\n\tSerial.begin(115200);\n\t$0\n}\n\nvoid loop() {\n\t\n}', 'Estructura'],
  ['#include', 'Incluye una librería o un archivo de cabecera.', '#include <${1:WiFi.h}>', 'Estructura'],
  ['#include ""', 'Incluye un archivo propio del proyecto.', '#include "${1:config.h}"', 'Estructura'],
  ['#define', 'Constante de preprocesador (se reemplaza antes de compilar).', '#define ${1:NOMBRE} ${2:valor}', 'Estructura'],
  ['#ifdef / #endif', 'Compila un bloque solo si un símbolo está definido.', '#ifdef ${1:DEBUG}\n\t$0\n#endif', 'Estructura'],
  ['#if / #else', 'Compilación condicional según el chip u otra condición.', '#if ${1:CONFIG_IDF_TARGET_ESP32S3}\n\t$2\n#else\n\t$0\n#endif', 'Estructura'],
  ['comentario', 'Comentario de una línea y de bloque.', '// ${1:comentario}\n/* ${2:bloque de comentario} */', 'Estructura'],
  ['bloque de encabezado', 'Cabecera descriptiva para un archivo.', '/*\n * Proyecto: ${1:nombre}\n * Autor:    ${2:autor}\n * Placa:    ${3:ESP32 Dev Module}\n * Descripción: $0\n */', 'Estructura'],

  // ---------- Control de flujo ----------
  ['if', 'Ejecuta un bloque solo si la condición es verdadera.', 'if (${1:condicion}) {\n\t$0\n}', 'Control de flujo'],
  ['if / else', 'Elige entre dos caminos según la condición.', 'if (${1:condicion}) {\n\t$2\n} else {\n\t$0\n}', 'Control de flujo'],
  ['if / else if / else', 'Evalúa varias condiciones en orden; la primera verdadera gana.', 'if (${1:a > 10}) {\n\t$2\n} else if (${3:a > 5}) {\n\t$4\n} else {\n\t$0\n}', 'Control de flujo'],
  ['switch / case', 'Elige un caso según el valor de una variable entera o char.', 'switch (${1:variable}) {\n\tcase ${2:1}:\n\t\t$3\n\t\tbreak;\n\tcase ${4:2}:\n\t\t$5\n\t\tbreak;\n\tdefault:\n\t\t$0\n\t\tbreak;\n}', 'Control de flujo'],
  ['for', 'Repite un bloque un número conocido de veces.', 'for (int ${1:i} = 0; ${1:i} < ${2:10}; ${1:i}++) {\n\t$0\n}', 'Control de flujo'],
  ['for (descendente)', 'Cuenta hacia atrás.', 'for (int ${1:i} = ${2:10}; ${1:i} >= 0; ${1:i}--) {\n\t$0\n}', 'Control de flujo'],
  ['for (paso)', 'Recorre con un incremento distinto de 1.', 'for (int ${1:i} = 0; ${1:i} <= ${2:255}; ${1:i} += ${3:5}) {\n\t$0\n}', 'Control de flujo'],
  ['for (recorrer arreglo)', 'Recorre todos los elementos de un arreglo (for de rango, C++11).', 'for (auto &${1:elem} : ${2:arreglo}) {\n\t$0\n}', 'Control de flujo'],
  ['while', 'Repite mientras la condición sea verdadera (se evalúa antes).', 'while (${1:condicion}) {\n\t$0\n}', 'Control de flujo'],
  ['do / while', 'Repite al menos una vez y luego mientras la condición sea verdadera.', 'do {\n\t$0\n} while (${1:condicion});', 'Control de flujo'],
  ['break', 'Sale inmediatamente del for, while o switch actual.', 'break;', 'Control de flujo'],
  ['continue', 'Salta a la siguiente iteración del bucle.', 'continue;', 'Control de flujo'],
  ['return', 'Sale de la función (y devuelve un valor si no es void).', 'return ${1:valor};', 'Control de flujo'],
  ['operador ternario', 'if/else en una sola expresión: condición ? valor_si : valor_no.', '${1:condicion} ? ${2:valorSi} : ${3:valorNo}', 'Control de flujo'],
  ['bucle infinito', 'Bucle que no termina (útil en tareas FreeRTOS).', 'for (;;) {\n\t$0\n}', 'Control de flujo'],
  ['goto (evitar)', 'Salto a una etiqueta. Úsalo solo para salir de bucles anidados.', 'goto ${1:salida};\n// ...\n${1:salida}:', 'Control de flujo'],

  // ---------- Variables y tipos ----------
  ['int', 'Entero con signo de 32 bits en ESP32 (−2 147 483 648 a 2 147 483 647).', 'int ${1:valor} = ${2:0};', 'Variables y tipos'],
  ['float / double', 'Números con decimales. float = 32 bits; double = 64 bits.', 'float ${1:temperatura} = ${2:0.0};', 'Variables y tipos'],
  ['bool', 'Verdadero o falso.', 'bool ${1:activo} = ${2|true,false|};', 'Variables y tipos'],
  ['char', 'Un carácter (8 bits).', "char ${1:letra} = '${2:A}';", 'Variables y tipos'],
  ['byte / uint8_t', 'Entero sin signo de 8 bits (0 a 255).', 'uint8_t ${1:valor} = ${2:0};', 'Variables y tipos'],
  ['uint16_t / uint32_t', 'Enteros sin signo de tamaño fijo.', 'uint32_t ${1:contador} = ${2:0};', 'Variables y tipos'],
  ['unsigned long', 'Entero sin signo de 32 bits; ideal para guardar millis().', 'unsigned long ${1:tiempo} = millis();', 'Variables y tipos'],
  ['int64_t / uint64_t', 'Enteros de 64 bits (por ejemplo, esp_timer_get_time()).', 'int64_t ${1:us} = esp_timer_get_time();', 'Variables y tipos'],
  ['const', 'Valor que no cambia; el compilador lo protege.', 'const int ${1:LED_PIN} = ${2:2};', 'Variables y tipos'],
  ['constexpr', 'Constante calculada en tiempo de compilación.', 'constexpr uint32_t ${1:BAUDIOS} = ${2:115200};', 'Variables y tipos'],
  ['static (local)', 'Variable local que conserva su valor entre llamadas.', 'static int ${1:contador} = 0;', 'Variables y tipos'],
  ['volatile', 'Variable compartida con una interrupción o con otra tarea.', 'volatile bool ${1:bandera} = false;', 'Variables y tipos'],
  ['arreglo', 'Lista de elementos del mismo tipo.', 'int ${1:valores}[${2:5}] = {${3:1, 2, 3, 4, 5}};', 'Variables y tipos'],
  ['arreglo 2D', 'Matriz de filas y columnas.', 'int ${1:matriz}[${2:3}][${3:3}] = {\n\t{1, 2, 3},\n\t{4, 5, 6},\n\t{7, 8, 9}\n};', 'Variables y tipos'],
  ['tamaño de arreglo', 'Número de elementos de un arreglo.', 'sizeof(${1:arreglo}) / sizeof(${1:arreglo}[0])', 'Variables y tipos'],
  ['struct', 'Agrupa varios datos relacionados en un tipo propio.', 'struct ${1:Lectura} {\n\tfloat ${2:temperatura};\n\tfloat ${3:humedad};\n\tunsigned long ${4:tiempo};\n};', 'Variables y tipos'],
  ['enum', 'Lista de estados con nombre.', 'enum ${1:Estado} { ${2:INACTIVO, MIDIENDO, ENVIANDO} };\n${1:Estado} ${3:estado} = ${4:INACTIVO};', 'Variables y tipos'],
  ['enum class', 'Enumeración con ámbito propio (más segura).', 'enum class ${1:Modo} : uint8_t { ${2:Auto, Manual} };', 'Variables y tipos'],
  ['puntero', 'Variable que guarda la dirección de otra.', 'int ${1:x} = 10;\nint *${2:p} = &${1:x};\n*${2:p} = 20;  // cambia x', 'Variables y tipos'],
  ['referencia', 'Alias de otra variable (útil en parámetros).', 'int &${1:ref} = ${2:variable};', 'Variables y tipos'],
  ['class', 'Clase con constructor, atributos y métodos.', 'class ${1:Sensor} {\npublic:\n\t${1:Sensor}(int pin) : pin_(pin) {}\n\tvoid begin() { pinMode(pin_, INPUT); }\n\tint leer() { return analogRead(pin_); }\nprivate:\n\tint pin_;\n};', 'Variables y tipos'],
  ['conversión de tipo', 'Convierte explícitamente entre tipos.', '(${1:float})${2:valor}', 'Variables y tipos'],

  // ---------- Funciones ----------
  ['función void', 'Función que no devuelve nada.', 'void ${1:nombre}(${2}) {\n\t$0\n}', 'Funciones'],
  ['función con retorno', 'Función que devuelve un valor.', '${1:int} ${2:sumar}(${3:int a, int b}) {\n\treturn ${4:a + b};\n}', 'Funciones'],
  ['parámetro por referencia', 'La función modifica la variable original.', 'void ${1:incrementar}(int &${2:valor}) {\n\t${2:valor}++;\n}', 'Funciones'],
  ['parámetro por defecto', 'Valor usado si no se pasa el argumento.', 'void ${1:parpadear}(int pin, int veces = ${2:3}) {\n\t$0\n}', 'Funciones'],
  ['prototipo', 'Declaración anticipada de una función.', '${1:void} ${2:nombre}(${3});', 'Funciones'],
  ['lambda', 'Función anónima (útil en callbacks, p. ej. WebServer).', '[${1:&}](${2}) {\n\t$0\n}', 'Funciones'],
  ['función inline', 'Sugiere al compilador insertar el código en cada llamada.', 'inline ${1:int} ${2:cuadrado}(${3:int x}) { return ${4:x * x}; }', 'Funciones'],

  // ---------- Operadores ----------
  ['comparación', '== igual, != distinto, < menor, > mayor, <= menor o igual, >= mayor o igual.', '${1:a} ${2|==,!=,<,>,<=,>=|} ${3:b}', 'Operadores'],
  ['lógicos', '&& y, || o, ! negación.', '(${1:a > 0}) ${2|&&,\\|\\||} (${3:b > 0})', 'Operadores'],
  ['aritméticos', '+ suma, - resta, * multiplicación, / división, % resto.', '${1:a} ${2|+,-,*,/,%|} ${3:b}', 'Operadores'],
  ['asignación compuesta', '+=, -=, *=, /=, %=, |=, &=, ^=, <<=, >>=.', '${1:x} ${2|+=,-=,*=,/=,%=,\\|=,&=,^=|} ${3:1};', 'Operadores'],
  ['incremento / decremento', 'Suma o resta 1.', '${1:i}${2|++,--|};', 'Operadores'],
  ['bit a bit', '& AND, | OR, ^ XOR, ~ NOT, << desplaza izquierda, >> desplaza derecha.', '${1:valor} ${2|&,\\|,^,<<,>>|} ${3:0x0F}', 'Operadores'],
  ['bitRead / bitWrite', 'Lee o escribe un bit concreto.', 'bitRead(${1:valor}, ${2:0});\nbitWrite(${1:valor}, ${2:0}, ${3:1});', 'Operadores'],
  ['bitSet / bitClear', 'Pone un bit a 1 o a 0.', 'bitSet(${1:valor}, ${2:3});\nbitClear(${1:valor}, ${2:3});', 'Operadores'],
  ['máscara de bit', 'Comprueba si un bit está activo.', 'if (${1:registro} & (1 << ${2:bit})) {\n\t$0\n}', 'Operadores'],
  ['highByte / lowByte', 'Byte alto y bajo de un valor de 16 bits.', 'uint8_t alto = highByte(${1:valor});\nuint8_t bajo = lowByte(${1:valor});', 'Operadores'],

  // ---------- Matemáticas ----------
  ['map', 'Reescala un valor de un rango a otro.', 'map(${1:valor}, ${2:0}, ${3:4095}, ${4:0}, ${5:255})', 'Matemáticas'],
  ['constrain', 'Limita un valor entre un mínimo y un máximo.', 'constrain(${1:valor}, ${2:0}, ${3:255})', 'Matemáticas'],
  ['min / max', 'El menor o el mayor de dos valores.', '${1|min,max|}(${2:a}, ${3:b})', 'Matemáticas'],
  ['abs', 'Valor absoluto.', 'abs(${1:valor})', 'Matemáticas'],
  ['pow / sqrt', 'Potencia y raíz cuadrada.', 'pow(${1:base}, ${2:exponente})\nsqrt(${3:valor})', 'Matemáticas'],
  ['sin / cos / tan', 'Funciones trigonométricas (en radianes).', '${1|sin,cos,tan|}(${2:angulo})', 'Matemáticas'],
  ['radianes / grados', 'Conversión entre grados y radianes.', 'radians(${1:grados})\ndegrees(${2:radianes})', 'Matemáticas'],
  ['round / floor / ceil', 'Redondeo al más cercano, hacia abajo o hacia arriba.', '${1|round,floor,ceil|}(${2:valor})', 'Matemáticas'],
  ['random', 'Número pseudoaleatorio entre mín (incluido) y máx (excluido).', 'random(${1:0}, ${2:100})', 'Matemáticas'],
  ['randomSeed', 'Inicializa el generador aleatorio.', 'randomSeed(esp_random());', 'Matemáticas'],
  ['esp_random', 'Número aleatorio real por hardware (32 bits).', 'esp_random()', 'Matemáticas'],
  ['promedio móvil', 'Suaviza lecturas ruidosas.', 'const int N = ${1:10};\nstatic int buffer[N];\nstatic int idx = 0;\nstatic long suma = 0;\nsuma -= buffer[idx];\nbuffer[idx] = ${2:analogRead(34)};\nsuma += buffer[idx];\nidx = (idx + 1) % N;\nint promedio = suma / N;', 'Matemáticas'],

  // ---------- Entradas y salidas ----------
  ['pinMode', 'Configura un pin como entrada o salida.', 'pinMode(${1:pin}, ${2|OUTPUT,INPUT,INPUT_PULLUP,INPUT_PULLDOWN|});', 'Entradas y salidas'],
  ['digitalWrite', 'Pone un pin digital en ALTO o BAJO.', 'digitalWrite(${1:pin}, ${2|HIGH,LOW|});', 'Entradas y salidas'],
  ['digitalRead', 'Lee el estado de un pin digital.', 'digitalRead(${1:pin})', 'Entradas y salidas'],
  ['alternar pin', 'Invierte el estado de una salida.', 'digitalWrite(${1:pin}, !digitalRead(${1:pin}));', 'Entradas y salidas'],
  ['analogRead', 'Lee el ADC (0–4095 con 12 bits).', 'analogRead(${1:pin})', 'Entradas y salidas'],
  ['analogReadMilliVolts', 'Lee el ADC calibrado en milivoltios.', 'analogReadMilliVolts(${1:pin})', 'Entradas y salidas'],
  ['analogReadResolution', 'Cambia la resolución del ADC (9–12 bits).', 'analogReadResolution(${1:12});', 'Entradas y salidas'],
  ['analogSetAttenuation', 'Rango de entrada del ADC (ADC_11db ≈ 0–3,1 V).', 'analogSetAttenuation(${1|ADC_11db,ADC_6db,ADC_2_5db,ADC_0db|});', 'Entradas y salidas'],
  ['analogWrite', 'PWM simple en cualquier pin de salida.', 'analogWrite(${1:pin}, ${2:128});', 'Entradas y salidas'],
  ['ledcAttach', 'Configura PWM LEDC (núcleo 3.x): pin, frecuencia, bits.', 'ledcAttach(${1:pin}, ${2:5000}, ${3:8});', 'Entradas y salidas'],
  ['ledcWrite', 'Ciclo de trabajo del PWM LEDC.', 'ledcWrite(${1:pin}, ${2:duty});', 'Entradas y salidas'],
  ['ledcWriteTone', 'Genera un tono (buzzer) con LEDC.', 'ledcWriteTone(${1:pin}, ${2:1000});', 'Entradas y salidas'],
  ['tone / noTone', 'Tono en un buzzer pasivo.', 'tone(${1:pin}, ${2:440}, ${3:200});\nnoTone(${1:pin});', 'Entradas y salidas'],
  ['dacWrite', 'Salida analógica real (GPIO25/26 en ESP32).', 'dacWrite(${1:25}, ${2:128});', 'Entradas y salidas'],
  ['touchRead', 'Lee un pin táctil capacitivo.', 'touchRead(${1:T0})', 'Entradas y salidas'],
  ['pulseIn', 'Mide la duración de un pulso en microsegundos (p. ej. HC-SR04).', 'pulseIn(${1:pin}, ${2|HIGH,LOW|}, ${3:30000})', 'Entradas y salidas'],
  ['sensor ultrasónico', 'Distancia en cm con HC-SR04.', 'digitalWrite(${1:TRIG}, LOW);\ndelayMicroseconds(2);\ndigitalWrite(${1:TRIG}, HIGH);\ndelayMicroseconds(10);\ndigitalWrite(${1:TRIG}, LOW);\nfloat cm = pulseIn(${2:ECHO}, HIGH, 30000) / 58.0;', 'Entradas y salidas'],
  ['antirrebote', 'Lectura de botón sin rebotes y sin delay().', 'static bool ultimo = HIGH;\nstatic unsigned long tCambio = 0;\nbool lectura = digitalRead(${1:BOTON});\nif (lectura != ultimo && millis() - tCambio > ${2:50}) {\n\ttCambio = millis();\n\tultimo = lectura;\n\tif (lectura == LOW) {\n\t\t$0\n\t}\n}', 'Entradas y salidas'],
  ['shiftOut', 'Envía un byte bit a bit (registro 74HC595).', 'shiftOut(${1:DATA}, ${2:CLOCK}, ${3|MSBFIRST,LSBFIRST|}, ${4:valor});', 'Entradas y salidas'],

  // ---------- Tiempo ----------
  ['delay', 'Pausa en milisegundos (bloquea el loop).', 'delay(${1:1000});', 'Tiempo'],
  ['delayMicroseconds', 'Pausa en microsegundos.', 'delayMicroseconds(${1:10});', 'Tiempo'],
  ['millis', 'Milisegundos desde el arranque.', 'millis()', 'Tiempo'],
  ['micros', 'Microsegundos desde el arranque.', 'micros()', 'Tiempo'],
  ['millis timer', 'Temporizador no bloqueante.', 'static unsigned long ${1:ultimo} = 0;\nif (millis() - ${1:ultimo} >= ${2:1000}) {\n\t${1:ultimo} = millis();\n\t$0\n}', 'Tiempo'],
  ['varios temporizadores', 'Dos tareas periódicas sin delay().', 'static unsigned long tA = 0, tB = 0;\nunsigned long ahora = millis();\nif (ahora - tA >= ${1:500}) {\n\ttA = ahora;\n\t$2\n}\nif (ahora - tB >= ${3:2000}) {\n\ttB = ahora;\n\t$0\n}', 'Tiempo'],
  ['hw timer', 'Temporizador por hardware con interrupción (núcleo 3.x).', 'hw_timer_t *${1:timer} = timerBegin(${2:1000000});\ntimerAttachInterrupt(${1:timer}, &${3:onTimer});\ntimerAlarm(${1:timer}, ${4:1000000}, true, 0);', 'Tiempo'],
  ['NTP (hora de internet)', 'Sincroniza el reloj por Wi‑Fi.', 'configTime(${1:-5} * 3600, 0, "pool.ntp.org");\nstruct tm t;\nif (getLocalTime(&t)) Serial.println(&t, "%d/%m/%Y %H:%M:%S");', 'Tiempo'],

  // ---------- Puerto serie ----------
  ['Serial.begin', 'Inicia el puerto serie.', 'Serial.begin(${1:115200});', 'Puerto serie'],
  ['Serial.print', 'Imprime sin salto de línea.', 'Serial.print(${1:"texto"});', 'Puerto serie'],
  ['Serial.println', 'Imprime con salto de línea.', 'Serial.println(${1:"texto"});', 'Puerto serie'],
  ['Serial.printf', 'Imprime con formato (%d entero, %f decimal, %s texto, %X hex).', 'Serial.printf("${1:%d}\\n", ${2:valor});', 'Puerto serie'],
  ['Serial.available', 'Lee los caracteres recibidos.', 'while (Serial.available()) {\n\tchar c = Serial.read();\n\t$0\n}', 'Puerto serie'],
  ['leer línea', 'Lee un comando completo hasta Enter.', 'if (Serial.available()) {\n\tString linea = Serial.readStringUntil(\'\\n\');\n\tlinea.trim();\n\t$0\n}', 'Puerto serie'],
  ['parseInt / parseFloat', 'Lee un número recibido por serie.', 'int ${1:n} = Serial.parseInt();', 'Puerto serie'],
  ['plot', 'Formato para el plotter: etiqueta:valor separados por coma.', 'Serial.printf("${1:a}:%f,${2:b}:%f\\n", ${3:v1}, ${4:v2});', 'Puerto serie'],
  ['Serial.flush', 'Espera a que se envíen todos los datos.', 'Serial.flush();', 'Puerto serie'],

  // ---------- Cadenas de texto ----------
  ['String', 'Texto dinámico de Arduino.', 'String ${1:mensaje} = "${2:Hola}";', 'Cadenas de texto'],
  ['concatenar', 'Une textos y números.', 'String ${1:texto} = "Temp: " + String(${2:t}, 1) + " C";', 'Cadenas de texto'],
  ['length / indexOf', 'Longitud y posición de un texto.', '${1:s}.length()\n${1:s}.indexOf("${2:,}")', 'Cadenas de texto'],
  ['substring', 'Extrae una parte del texto.', '${1:s}.substring(${2:0}, ${3:5})', 'Cadenas de texto'],
  ['toInt / toFloat', 'Convierte texto a número.', '${1:s}.toInt()\n${1:s}.toFloat()', 'Cadenas de texto'],
  ['equals / startsWith', 'Compara textos.', 'if (${1:s} == "${2:on}") { }\nif (${1:s}.startsWith("${3:led}")) { }', 'Cadenas de texto'],
  ['toUpperCase / trim', 'Mayúsculas y quitar espacios.', '${1:s}.toUpperCase();\n${1:s}.trim();', 'Cadenas de texto'],
  ['char[] + snprintf', 'Texto en un búfer fijo (sin memoria dinámica).', 'char ${1:buf}[${2:64}];\nsnprintf(${1:buf}, sizeof(${1:buf}), "${3:T=%.1f}", ${4:valor});', 'Cadenas de texto'],
  ['strcmp / strlen', 'Funciones de C para cadenas char[].', 'strcmp(${1:a}, ${2:b}) == 0\nstrlen(${3:a})', 'Cadenas de texto'],
  ['separar por comas', 'Divide un texto en partes.', 'int desde = 0;\nwhile (true) {\n\tint coma = ${1:s}.indexOf(\',\', desde);\n\tString parte = ${1:s}.substring(desde, coma < 0 ? ${1:s}.length() : coma);\n\t$0\n\tif (coma < 0) break;\n\tdesde = coma + 1;\n}', 'Cadenas de texto'],

  // ---------- Interrupciones ----------
  ['attachInterrupt', 'Llama a una función cuando cambia un pin.', 'attachInterrupt(digitalPinToInterrupt(${1:pin}), ${2:isr}, ${3|RISING,FALLING,CHANGE|});', 'Interrupciones'],
  ['IRAM_ATTR isr', 'Rutina de interrupción (debe ser corta).', 'void IRAM_ATTR ${1:isr}() {\n\t$0\n}', 'Interrupciones'],
  ['detachInterrupt', 'Desactiva la interrupción de un pin.', 'detachInterrupt(digitalPinToInterrupt(${1:pin}));', 'Interrupciones'],
  ['sección crítica', 'Protege datos compartidos con una ISR.', 'portMUX_TYPE ${1:mux} = portMUX_INITIALIZER_UNLOCKED;\nportENTER_CRITICAL(&${1:mux});\n$0\nportEXIT_CRITICAL(&${1:mux});', 'Interrupciones'],

  // ---------- Wi‑Fi y red ----------
  ['WiFi.begin', 'Conectar a Wi‑Fi (estación).', 'WiFi.mode(WIFI_STA);\nWiFi.begin("${1:SSID}", "${2:PASSWORD}");\nwhile (WiFi.status() != WL_CONNECTED) {\n\tdelay(500);\n\tSerial.print(".");\n}\nSerial.println(WiFi.localIP());', 'Wi‑Fi y red'],
  ['WiFi.softAP', 'Crear un punto de acceso.', 'WiFi.softAP("${1:ESP32-AP}", "${2:12345678}");\nSerial.println(WiFi.softAPIP());', 'Wi‑Fi y red'],
  ['WiFi.scanNetworks', 'Buscar redes cercanas.', 'int n = WiFi.scanNetworks();\nfor (int i = 0; i < n; i++) {\n\tSerial.printf("%s (%d dBm)\\n", WiFi.SSID(i).c_str(), WiFi.RSSI(i));\n}', 'Wi‑Fi y red'],
  ['WebServer', 'Servidor web básico.', '#include <WebServer.h>\nWebServer server(80);\n\nserver.on("/", []() {\n\tserver.send(200, "text/html", "${1:<h1>Hola ESP32</h1>}");\n});\nserver.begin();', 'Wi‑Fi y red'],
  ['HTTPClient GET', 'Petición HTTP GET.', 'HTTPClient http;\nhttp.begin("${1:http://example.com}");\nint code = http.GET();\nif (code > 0) Serial.println(http.getString());\nhttp.end();', 'Wi‑Fi y red'],
  ['HTTPClient POST', 'Enviar datos JSON por HTTP POST.', 'HTTPClient http;\nhttp.begin("${1:http://example.com/api}");\nhttp.addHeader("Content-Type", "application/json");\nint code = http.POST("${2:{\\"temp\\":25}}");\nhttp.end();', 'Wi‑Fi y red'],
  ['mDNS', 'Acceder como http://nombre.local.', '#include <ESPmDNS.h>\nMDNS.begin("${1:esp32}");', 'Wi‑Fi y red'],
  ['OTA', 'Actualización por Wi‑Fi (ArduinoOTA).', '#include <ArduinoOTA.h>\nArduinoOTA.setHostname("${1:esp32}");\nArduinoOTA.begin();\n// en loop(): ArduinoOTA.handle();', 'Wi‑Fi y red'],

  // ---------- Bluetooth ----------
  ['BLE server', 'Servidor BLE básico.', '#include <BLEDevice.h>\n#include <BLEServer.h>\n\nBLEDevice::init("${1:ESP32-BLE}");\nBLEServer *srv = BLEDevice::createServer();\nBLEService *svc = srv->createService("${2:4fafc201-1fb5-459e-8fcc-c5c9c331914b}");\nBLECharacteristic *ch = svc->createCharacteristic("${3:beb5483e-36e1-4688-b7f5-ea07361b26a8}", BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE);\nch->setValue("Hola");\nsvc->start();\nBLEDevice::getAdvertising()->start();', 'Bluetooth'],
  ['BluetoothSerial', 'Bluetooth clásico SPP (solo ESP32 original).', '#include <BluetoothSerial.h>\nBluetoothSerial SerialBT;\nSerialBT.begin("${1:ESP32-BT}");', 'Bluetooth'],

  // ---------- FreeRTOS ----------
  ['xTaskCreatePinnedToCore', 'Crea una tarea en un núcleo concreto.', 'xTaskCreatePinnedToCore(${1:tarea}, "${1:tarea}", ${2:4096}, NULL, ${3:1}, NULL, ${4:1});', 'FreeRTOS'],
  ['task function', 'Función de una tarea FreeRTOS.', 'void ${1:tarea}(void *pv) {\n\tfor (;;) {\n\t\t$0\n\t\tvTaskDelay(pdMS_TO_TICKS(${2:1000}));\n\t}\n}', 'FreeRTOS'],
  ['vTaskDelay', 'Pausa la tarea sin bloquear las demás.', 'vTaskDelay(pdMS_TO_TICKS(${1:100}));', 'FreeRTOS'],
  ['cola (queue)', 'Envía datos entre tareas.', 'QueueHandle_t ${1:cola} = xQueueCreate(${2:10}, sizeof(${3:int}));\nxQueueSend(${1:cola}, &${4:dato}, portMAX_DELAY);\nxQueueReceive(${1:cola}, &${4:dato}, portMAX_DELAY);', 'FreeRTOS'],
  ['mutex', 'Protege un recurso compartido entre tareas.', 'SemaphoreHandle_t ${1:mutex} = xSemaphoreCreateMutex();\nif (xSemaphoreTake(${1:mutex}, portMAX_DELAY)) {\n\t$0\n\txSemaphoreGive(${1:mutex});\n}', 'FreeRTOS'],
  ['semáforo binario', 'Señal de una ISR a una tarea.', 'SemaphoreHandle_t ${1:sem} = xSemaphoreCreateBinary();\n// en la ISR: xSemaphoreGiveFromISR(${1:sem}, NULL);\nxSemaphoreTake(${1:sem}, portMAX_DELAY);', 'FreeRTOS'],
  ['xPortGetCoreID', 'Núcleo en el que se ejecuta el código.', 'xPortGetCoreID()', 'FreeRTOS'],

  // ---------- Energía ----------
  ['deep sleep timer', 'Dormir profundamente y despertar por temporizador.', 'esp_sleep_enable_timer_wakeup(${1:10} * 1000000ULL);\nesp_deep_sleep_start();', 'Energía'],
  ['deep sleep ext0', 'Despertar por un pin.', 'esp_sleep_enable_ext0_wakeup(GPIO_NUM_${1:33}, ${2:1});\nesp_deep_sleep_start();', 'Energía'],
  ['light sleep', 'Sueño ligero: mantiene la RAM y continúa después.', 'esp_sleep_enable_timer_wakeup(${1:1000000});\nesp_light_sleep_start();', 'Energía'],
  ['RTC_DATA_ATTR', 'Variable que sobrevive al deep sleep.', 'RTC_DATA_ATTR int ${1:arranques} = 0;', 'Energía'],
  ['causa de despertar', 'Motivo por el que despertó el chip.', 'esp_sleep_wakeup_cause_t causa = esp_sleep_get_wakeup_cause();', 'Energía'],
  ['setCpuFrequencyMhz', 'Reduce la frecuencia para ahorrar energía.', 'setCpuFrequencyMhz(${1|240,160,80|});', 'Energía'],

  // ---------- Memoria y sistema ----------
  ['Preferences', 'Guarda datos en flash (NVS) que no se pierden al apagar.', '#include <Preferences.h>\nPreferences prefs;\nprefs.begin("${1:app}", false);\nint ${2:valor} = prefs.getInt("${2:valor}", 0);\nprefs.putInt("${2:valor}", ${2:valor} + 1);\nprefs.end();', 'Memoria y sistema'],
  ['LittleFS', 'Sistema de archivos en flash.', '#include <LittleFS.h>\nLittleFS.begin(true);\nFile f = LittleFS.open("${1:/datos.txt}", "${2|w,r,a|}");\nf.println("${3:hola}");\nf.close();', 'Memoria y sistema'],
  ['ESP.getFreeHeap', 'Memoria RAM libre.', 'ESP.getFreeHeap()', 'Memoria y sistema'],
  ['ESP.getChipModel', 'Modelo y revisión del chip.', 'Serial.printf("%s rev %d\\n", ESP.getChipModel(), ESP.getChipRevision());', 'Memoria y sistema'],
  ['ESP.restart', 'Reinicia el ESP32.', 'ESP.restart();', 'Memoria y sistema'],
  ['temperatureRead', 'Temperatura interna aproximada del chip.', 'temperatureRead()', 'Memoria y sistema'],
  ['watchdog', 'Reinicia si el código se cuelga (núcleo 3.x).', '#include <esp_task_wdt.h>\nesp_task_wdt_config_t cfg = { .timeout_ms = ${1:5000}, .idle_core_mask = 0, .trigger_panic = true };\nesp_task_wdt_reconfigure(&cfg);\nesp_task_wdt_add(NULL);\n// en loop(): esp_task_wdt_reset();', 'Memoria y sistema'],
  ['PSRAM', 'Reserva memoria en la PSRAM externa.', 'uint8_t *${1:buf} = (uint8_t *)ps_malloc(${2:100000});', 'Memoria y sistema'],

  // ---------- Buses ----------
  ['Wire.begin', 'Inicia I2C (SDA, SCL).', 'Wire.begin(${1:21}, ${2:22});', 'Buses (I2C, SPI, UART)'],
  ['I2C scanner', 'Busca dispositivos en el bus I2C.', 'for (uint8_t a = 1; a < 127; a++) {\n\tWire.beginTransmission(a);\n\tif (Wire.endTransmission() == 0) Serial.printf("I2C 0x%02X\\n", a);\n}', 'Buses (I2C, SPI, UART)'],
  ['I2C escribir / leer', 'Escribe un registro y lee bytes.', 'Wire.beginTransmission(${1:0x68});\nWire.write(${2:0x3B});\nWire.endTransmission(false);\nWire.requestFrom(${1:0x68}, ${3:6});\nwhile (Wire.available()) {\n\tuint8_t b = Wire.read();\n}', 'Buses (I2C, SPI, UART)'],
  ['SPI.begin', 'Inicia SPI (SCK, MISO, MOSI, SS).', 'SPI.begin(${1:18}, ${2:19}, ${3:23}, ${4:5});', 'Buses (I2C, SPI, UART)'],
  ['SPI transferencia', 'Envía y recibe un byte por SPI.', 'SPI.beginTransaction(SPISettings(${1:1000000}, MSBFIRST, SPI_MODE0));\ndigitalWrite(${2:SS}, LOW);\nuint8_t r = SPI.transfer(${3:0x00});\ndigitalWrite(${2:SS}, HIGH);\nSPI.endTransaction();', 'Buses (I2C, SPI, UART)'],
  ['Serial2.begin', 'UART2 con pines propios.', 'Serial2.begin(${1:9600}, SERIAL_8N1, ${2:16}, ${3:17});', 'Buses (I2C, SPI, UART)'],

  // ---------- ESP-IDF ----------
  ['app_main', 'Punto de entrada de un proyecto ESP-IDF.', 'void app_main(void)\n{\n\t$0\n}', 'ESP-IDF'],
  ['ESP_LOGI', 'Mensaje de log (I info, W aviso, E error, D depuración).', 'ESP_LOG${1|I,W,E,D|}("${2:TAG}", "${3:mensaje}");', 'ESP-IDF'],
  ['gpio_set_direction', 'Configura un GPIO como salida.', 'gpio_reset_pin(GPIO_NUM_${1:2});\ngpio_set_direction(GPIO_NUM_${1:2}, GPIO_MODE_OUTPUT);', 'ESP-IDF'],
  ['gpio_set_level', 'Pone un GPIO en 1 o 0.', 'gpio_set_level(GPIO_NUM_${1:2}, ${2|1,0|});', 'ESP-IDF'],
  ['ESP_ERROR_CHECK', 'Aborta con mensaje si la función devuelve error.', 'ESP_ERROR_CHECK(${1:funcion()});', 'ESP-IDF'],
  ['esp_timer_get_time', 'Microsegundos desde el arranque (64 bits).', 'esp_timer_get_time()', 'ESP-IDF']
];
