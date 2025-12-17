/**
 * AudioService - Ses dosyalarını çalmak için merkezi servis
 * 
 * Development: Metro bundler'dan HTTP URL ile çalar
 * Production: Asset'leri cache'e kopyalayıp file:// URI ile çalar
 */

import Sound from 'react-native-sound';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

// Ses kategorisini ayarla (bir kez)
let categorySet = false;

export class AudioService {
  private static currentSound: Sound | null = null;
  private static currentPlayingId: string | null = null;

  /**
   * Ses dosyasını çal
   * @param audioPath Ses dosyası yolu (örn: "filename.mp3")
   * @param id Benzersiz ID (aynı sesi tekrar çalmayı önlemek için)
   * @returns Promise<boolean> - Başarılı ise true
   */
  static async playAudio(audioPath: string, id: string): Promise<boolean> {
    try {
      console.log('🎵 AudioService.playAudio called:', { audioPath, id });

      // Önceki sesi durdur
      if (this.currentSound) {
        console.log('🛑 Stopping previous sound');
        this.currentSound.stop();
        this.currentSound.release();
        this.currentSound = null;
      }

      // Eğer aynı sesi tekrar çalıyorsak, sadece durdur
      if (this.currentPlayingId === id) {
        console.log('⏸️ Same audio, stopping');
        this.currentPlayingId = null;
        return true;
      }

      // Audio kategorisini ayarla (bir kez)
      if (!categorySet) {
        Sound.setCategory('Playback', true);
        categorySet = true;
      }

      let soundPath: string;
      let soundBasePath: string | undefined;

      if (__DEV__) {
        // Development: Metro bundler'dan HTTP URL ile yükle
        const metroPort = '8081';
        if (Platform.OS === 'android') {
          // Android emulator için 10.0.2.2
          soundPath = `http://10.0.2.2:${metroPort}/assets/audio/${encodeURIComponent(audioPath)}`;
        } else {
          soundPath = `http://localhost:${metroPort}/assets/audio/${encodeURIComponent(audioPath)}`;
        }
        soundBasePath = undefined; // HTTP URL için
        console.log('📱 Development mode - HTTP URL:', soundPath);
      } else {
        // Production: Android'de assets klasöründen cache'e kopyalayıp çal
        if (Platform.OS === 'android') {
          // res/raw yaklaşımı güvenilir değil, direkt assets'ten cache'e kopyalayıp çalalım
          // Bu hem daha güvenilir hem de uygulama boyutunu küçültür (res/raw'a kopyalamaya gerek yok)
          console.log('📱 Production mode - Will copy from assets to cache:', audioPath);
          
          // İlk denemede boş path ver, error callback'te cache'e kopyalayıp tekrar deneyeceğiz
          soundPath = '';
          soundBasePath = undefined;
        } else {
          soundPath = audioPath;
          soundBasePath = Sound.MAIN_BUNDLE;
        }
      }

      // Promise ile ses yükleme
      return new Promise(async (resolve) => {
        // Production Android'de direkt assets'ten cache'e kopyalayıp çal
        if (!__DEV__ && Platform.OS === 'android') {
          try {
            console.log('📦 Production Android: Copying asset to cache first...');
            // build.gradle'da assets.srcDirs += ['../../assets/audio'] var
            // Bu durumda assets klasörü direkt audio klasörü oluyor
            // RNFS.copyFileAssets için path sadece dosya adı olmalı (audio/ prefix'i olmadan)
            const assetPath = audioPath;
            const safeFileName = audioPath.replace(/[^a-zA-Z0-9._-]/g, '_');
            const cachePath = `${RNFS.CachesDirectoryPath}/${safeFileName}`;
            
            // Cache'de dosya var mı kontrol et
            const fileExists = await RNFS.exists(cachePath);
            
            if (!fileExists) {
              console.log('📦 Copying from assets (path:', assetPath, ')');
              console.log('📦 To cache:', cachePath);
              await RNFS.copyFileAssets(assetPath, cachePath);
              console.log('✅ Asset copied to cache successfully');
            } else {
              console.log('✅ Using existing cached file:', cachePath);
            }
            
            // Cache'den çal
            soundPath = cachePath;
            soundBasePath = undefined;
          } catch (cacheError: any) {
            console.error('❌ Error copying asset to cache:', cacheError);
            console.error('❌ Asset path was:', audioPath);
            console.error('❌ Error message:', cacheError.message);
            console.error('❌ Full error:', JSON.stringify(cacheError, null, 2));
            resolve(false);
            return;
          }
        }
        
        console.log('🎵 Creating Sound object with path:', soundPath, 'basePath:', soundBasePath);
        
        const tryLoadSound = async (path: string, basePath: string | undefined, isRetry: boolean = false): Promise<boolean> => {
          return new Promise((innerResolve) => {
            const newSound = new Sound(
              path,
              basePath,
              async (error) => {
                if (error) {
                  console.error('❌ Error loading audio:', error);
                  console.error('❌ Error details:', JSON.stringify(error, null, 2));
                  console.error('❌ Audio path was:', path);
                  
                  this.currentSound = null;
                  this.currentPlayingId = null;
                  innerResolve(false);
                  return;
                }

                console.log('✅ Sound loaded successfully, playing...');

                // Ses yüklendi, çal
                newSound.play((success) => {
                  if (success) {
                    console.log('✅ Playback completed');
                  } else {
                    console.error('❌ Playback failed - success:', success);
                  }
                  
                  // Temizlik
                  if (!isRetry) {
                    this.currentSound = null;
                    this.currentPlayingId = null;
                  }
                  newSound.release();
                  innerResolve(success);
                });
              }
            );

            if (!isRetry) {
              this.currentSound = newSound;
              this.currentPlayingId = id;
              console.log('✅ Sound object created and state updated');
            }
          });
        };

        // İlk denemeyi yap (Production Android'de artık cache path'i hazır)
        const success = await tryLoadSound(soundPath, soundBasePath);
        resolve(success);
      });
    } catch (error) {
      console.error('❌ Error in AudioService.playAudio:', error);
      this.currentSound = null;
      this.currentPlayingId = null;
      return false;
    }
  }

  /**
   * Çalan sesi durdur
   */
  static stop(): void {
    if (this.currentSound) {
      console.log('🛑 AudioService.stop called');
      this.currentSound.stop();
      this.currentSound.release();
      this.currentSound = null;
      this.currentPlayingId = null;
    }
  }

  /**
   * Şu anda ses çalıyor mu?
   */
  static isPlaying(id: string): boolean {
    return this.currentPlayingId === id && this.currentSound !== null;
  }
}

