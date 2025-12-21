# Java 21 Kurulumu (Zorunlu)

## Sorun
Uygulama `java.lang.NoSuchMethodError: removeLast()` hatası veriyor çünkü bir native modül Java 21 metodunu kullanıyor.

## Çözüm: Java 21 Kurulumu

### 1. Java 21 İndir
- https://www.oracle.com/java/technologies/downloads/#java21
- Windows x64 Installer'ı indir

### 2. Java 21'i Kur
- İndirilen .exe dosyasını çalıştır
- Varsayılan konuma kur: `C:\Program Files\Java\jdk-21`

### 3. gradle.properties'i Güncelle
`android/gradle.properties` dosyasında şu satırı bulun:
```
org.gradle.java.home=C:/Program Files/Java/jdk-17
```

Şunu yapın:
```
org.gradle.java.home=C:/Program Files/Java/jdk-21
```

### 4. Build.gradle'i Güncelle
`android/app/build.gradle` dosyasında şu satırları bulun:
```gradle
compileOptions {
    sourceCompatibility JavaVersion.VERSION_17
    targetCompatibility JavaVersion.VERSION_17
}

kotlinOptions {
    jvmTarget = '17'
}
```

Şunu yapın:
```gradle
compileOptions {
    sourceCompatibility JavaVersion.VERSION_21
    targetCompatibility JavaVersion.VERSION_21
}

kotlinOptions {
    jvmTarget = '21'
}
```

### 5. Temizle ve Yeniden Build Et
```powershell
cd android
.\gradlew.bat --stop
.\gradlew.bat clean
cd ..
npx react-native run-android
```

## Alternatif: Java 21 Kurmak İstemiyorsanız

Eğer Java 21 kurmak istemiyorsanız, React Native'i güncellemeniz gerekebilir:
```powershell
npm install react-native@latest
```

AMA BU DAHA FAZLA SORUN ÇIKARABİLİR!

## Önerilen: Java 21 Kurun
Java 21 kurmak en güvenli ve hızlı çözümdür.




