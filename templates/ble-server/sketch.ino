// Servidor BLE — ESP32 Studio
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>

#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHAR_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26a8"

class Callbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) override {
    Serial.printf("Recibido: %s\n", c->getValue().c_str());
  }
};

void setup() {
  Serial.begin(115200);
  BLEDevice::init("ESP32-Studio");
  BLEServer *server = BLEDevice::createServer();
  BLEService *service = server->createService(SERVICE_UUID);
  BLECharacteristic *ch = service->createCharacteristic(
      CHAR_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE);
  ch->setCallbacks(new Callbacks());
  ch->setValue("Hola desde ESP32");
  service->start();
  BLEAdvertising *adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  BLEDevice::startAdvertising();
  Serial.println("BLE anunciando como ESP32-Studio");
}

void loop() {
  delay(1000);
}
