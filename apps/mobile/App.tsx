import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Button, ActivityIndicator, Linking, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';

export default function App() {
  const [jobUrl, setJobUrl] = useState('');
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resumeLink, setResumeLink] = useState<string | null>(null);
  const [clLink, setClLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    });
    if (res.canceled) return;
    const f = res.assets[0];
    setFileUri(f.uri);
    setFileName(f.name || 'resume');
  };

  const submit = async () => {
    try {
      setError(null);
      setLoading(true);
      setResumeLink(null);
      setClLink(null);

      if (!fileUri || !jobUrl) {
        setError('Please choose a file and paste a job URL.');
        setLoading(false);
        return;
      }

      const form = new FormData();
      // read file into blob
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      const fileData: any = {
        uri: fileUri,
        name: fileName || 'resume',
        type: (() => {
          if ((fileName||'').endsWith('.pdf')) return 'application/pdf';
          if ((fileName||'').endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          return 'text/plain';
        })()
      };
      form.append('file', fileData as any);
      form.append('job_url', jobUrl);

      const endpoint = `${API_URL}/api/generate`;
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          // @ts-ignore - React Native sets boundary automatically
          'Content-Type': 'multipart/form-data'
        },
        body: form as any
      });

      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json?.error || 'Request failed');
      }
      setResumeLink(json.resume_url);
      setClLink(json.cover_letter_url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>One-Page Resume & Cover Letter Generator</Text>
      <Text>1) Upload your master resume (.pdf, .docx, or .txt)</Text>
      <Button title={fileName ? `Picked: ${fileName}` : 'Pick Resume File'} onPress={pickFile} />

      <Text style={{ marginTop: 12 }}>2) Paste job posting URL</Text>
      <TextInput
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 }}
        placeholder="https://company.com/careers/role"
        value={jobUrl}
        onChangeText={setJobUrl}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={{ marginTop: 16 }}>
        <Button title="Generate" onPress={submit} />
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 16 }} />}
      {error && <Text style={{ color: 'red' }}>{error}</Text>}

      {resumeLink && (
        <View style={{ marginTop: 16 }}>
          <Text>Resume PDF:</Text>
          <Text style={{ color: 'blue' }} onPress={() => Linking.openURL(resumeLink!)}>{resumeLink}</Text>
        </View>
      )}
      {clLink && (
        <View style={{ marginTop: 8 }}>
          <Text>Cover Letter PDF:</Text>
          <Text style={{ color: 'blue' }} onPress={() => Linking.openURL(clLink!)}>{clLink}</Text>
        </View>
      )}

      <View style={{ flex: 1 }} />
      <Text style={{ color: '#999', fontSize: 12 }}>API: {API_URL}</Text>
    </SafeAreaView>
  );
}
