# Proyecto de prueba — ESP32 Studio

Sirve para comprobar de punta a punta que el IDE funciona: compilar, cargar, monitor serie, plotter y simulación.

## Cómo abrirlo
1. En ESP32 Studio: **Inicio → Abrir proyecto** y selecciona esta carpeta (`ejemplos/prueba_esp32`).
   (O cópiala a `Documentos\ESP32 Studio\` para que aparezca en *Proyectos*.)
2. Placa: **ESP32 Dev Module** (`esp32:esp32:esp32`).

## Qué probar
| Prueba | Cómo | Resultado esperado |
|---|---|---|
| Compilar | `Ctrl+R` | "Compilación correcta" y medidores de Flash/RAM en el Inicio |
| Cargar | Elige el puerto COM y `Ctrl+U` | "Carga completada"; el LED de GPIO2 parpadea |
| Monitor serie | Pestaña **Monitor → Conectar** (115200) | Aparece la ficha del chip (modelo, núcleos, flash, MAC) |
| Comandos | Escribe `ayuda`, `info`, `led off`, `modo` | El ESP32 responde a cada comando |
| Plotter | Gira el potenciómetro | Tres curvas: `pot`, `mV`, `brillo` |
| Simulación | **Simulador → Wokwi → Compilar y simular** (o `F5`) | La consola muestra la ficha del chip; LEDs, botón y potenciómetro ya están cableados en `diagram.json` |
| QEMU | **Simulador → QEMU → Compilar y simular** | Arranca el firmware y muestra la ficha del chip (sin periféricos) |

## Circuito
| Pin | Componente |
|---|---|
| GPIO2 | LED rojo + 220 Ω (latido) |
| GPIO18 | LED azul + 220 Ω (brillo PWM) |
| GPIO4 | Pulsador a GND (cambia de modo: potenciómetro → respirar → apagado) |
| GPIO34 | Potenciómetro (centro), extremos a 3V3 y GND |

Con una placa sola (sin componentes externos) funcionan el latido en el LED integrado (GPIO2), el monitor serie y los comandos; usa `modo` por el monitor serie en lugar del pulsador.
