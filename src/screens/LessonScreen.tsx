import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import Pdf from 'react-native-pdf';
import { Colors, Spacing, Typography } from '../constants/theme';

export default function LessonScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<any>>();
  const route = useRoute();

  const [pdfSource, setPdfSource] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const PDF_NAME = '714190601-Almanca-Gramer-Kitabı-Ahmet-Bergman';

  const openPdf = useCallback(async (pdfName: string) => {
    try {
      console.log('📄 Opening PDF:', pdfName);
      
      // Production modda bundled asset'i kullan
      if (!__DEV__) {
        console.log('📦 Production: Using bundled asset');
        setPdfSource({
          uri: `bundle-assets://pdfs/${pdfName}.pdf`,
          cache: true,
        });
        return;
      }
      
      // Development modda Metro'dan yükle
      const cacheDir = Platform.OS === 'android' 
        ? RNFS.CachesDirectoryPath 
        : RNFS.DocumentDirectoryPath;
      const localPath = `${cacheDir}/${pdfName}.pdf`;
      
      const fileExists = await RNFS.exists(localPath);
      
      if (!fileExists) {
          try {
          console.log('📱 Development: Downloading PDF from Metro...');
            const metroPort = '8081';
            const pdfUrl = Platform.OS === 'android'
              ? `http://10.0.2.2:${metroPort}/assets/pdfs/${encodeURIComponent(pdfName)}.pdf`
              : `http://localhost:${metroPort}/assets/pdfs/${encodeURIComponent(pdfName)}.pdf`;
            
            const downloadResult = await RNFS.downloadFile({
              fromUrl: pdfUrl,
              toFile: localPath,
            }).promise;
            
            if (downloadResult.statusCode === 200) {
            console.log('✅ PDF downloaded:', localPath);
            } else {
            throw new Error(`Download failed: ${downloadResult.statusCode}`);
            }
        } catch (error: any) {
          console.error('❌ Download error:', error);
          Alert.alert('Hata', `PDF indirilemedi: ${error?.message}`);
            return;
        }
      } else {
        console.log('✅ Using cached PDF:', localPath);
      }
      
      setPdfSource({
        uri: `file://${localPath}`,
        cache: true,
      });
    } catch (error: any) {
      console.error('❌ Error:', error);
      Alert.alert('Hata', `PDF açılamadı: ${error?.message}`);
    }
  }, []);

  useEffect(() => {
    openPdf(PDF_NAME);
  }, [openPdf]);

  if (!pdfSource) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>PDF hazırlanıyor...</Text>
        </View>
      </View>
    );
  }

    return (
    <View style={styles.container}>
            {totalPages > 0 && (
        <View style={styles.navigationBar}>
              <Text style={styles.pageInfo}>
            Sayfa {currentPage} / {totalPages}
              </Text>
        </View>
      )}
      
      <View style={styles.pdfContainer}>
        <Pdf
          trustAllCerts={false}
          source={pdfSource}
          onLoadComplete={(numberOfPages) => {
            console.log(`📄 PDF yüklendi - ${numberOfPages} sayfa`);
            setTotalPages(numberOfPages);
          }}
          onPageChanged={(page, numberOfPages) => {
            setCurrentPage(page);
          }}
          onError={(error) => {
            console.error('❌ PDF hatası:', error);
            Alert.alert('Hata', 'PDF yüklenemedi');
          }}
          style={styles.pdfViewer}
          enablePaging={true}
          horizontal={true}
          spacing={0}
          fitPolicy={0}
          renderActivityIndicator={() => (
            <ActivityIndicator size="large" color={Colors.primary} />
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  pageInfo: {
    ...Typography.body,
    color: '#fff',
    fontWeight: 'bold',
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  pdfViewer: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
});
