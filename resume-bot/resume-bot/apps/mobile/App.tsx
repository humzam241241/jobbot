import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Alert, FlatList, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Google from 'expo-auth-session/providers/google';
import * as DocumentPicker from 'expo-document-picker';
import { Button, TextInput } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';

async function api(path: string, opts: any = {}) {
	const token = await SecureStore.getItemAsync('jwt');
	const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
	const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
	return res;
}

const Tab = createBottomTabNavigator();

export default function App() {
	const [token, setToken] = useState<string | null>(null);
	const [role, setRole] = useState<string | null>(null);
	const [membershipStatus, setMembershipStatus] = useState<string | null>(null);
	const [jobUrl, setJobUrl] = useState('');
	const [pickedDoc, setPickedDoc] = useState<any | null>(null);
	const [lastResult, setLastResult] = useState<{ resumeUrl: string; coverLetterUrl: string } | null>(null);

	const [_, googleResponse, promptAsync] = Google.useAuthRequest({
		expoClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
		iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
		androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
		webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
		responseType: 'id_token',
		scopes: ['openid', 'email', 'profile'],
	});

	useEffect(() => {
		(async () => {
			const stored = await SecureStore.getItemAsync('jwt');
			const sRole = await SecureStore.getItemAsync('role');
			const sStatus = await SecureStore.getItemAsync('membershipStatus');
			if (stored) setToken(stored);
			if (sRole) setRole(sRole);
			if (sStatus) setMembershipStatus(sStatus);
		})();
	}, []);

	useEffect(() => {
		(async () => {
			const idToken = (googleResponse as any)?.params?.id_token;
			if (!idToken) return;
			const r = await fetch(`${API_URL}/auth/google`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
			const j = await r.json();
			if (j?.jwt) {
				await SecureStore.setItemAsync('jwt', j.jwt);
				await SecureStore.setItemAsync('role', j.role);
				await SecureStore.setItemAsync('membershipStatus', j.membershipStatus);
				setToken(j.jwt);
				setRole(j.role);
				setMembershipStatus(j.membershipStatus);
			} else {
				Alert.alert('Login failed');
			}
		})();
	}, [googleResponse]);

	async function pickResume() {
		const pick = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'] });
		if (pick.canceled || !pick.assets?.[0]) return;
		setPickedDoc(pick.assets[0]);
	}

	async function generate() {
		if (!jobUrl) return Alert.alert('Enter job URL');
		let doc = pickedDoc;
		if (!doc) {
			const pick = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'] });
			if (pick.canceled || !pick.assets?.[0]) return;
			doc = pick.assets[0];
			setPickedDoc(doc);
		}

		const form = new FormData();
		form.append('jobUrl', jobUrl);
		// @ts-ignore
		form.append('resume', { uri: doc.uri, name: doc.name || 'resume', type: doc.mimeType || 'application/octet-stream' });

		const tokenStr = token ? `Bearer ${token}` : '';
		const res = await fetch(`${API_URL}/ai/generate`, { method: 'POST', headers: { Authorization: tokenStr }, body: form as any });
		const j = await res.json();
		if (j.resumeUrl && j.coverLetterUrl) {
			setLastResult({ resumeUrl: `${API_URL}${j.resumeUrl}`, coverLetterUrl: `${API_URL}${j.coverLetterUrl}` });
		} else if (j?.code === 'QUOTA_EXCEEDED') {
			Alert.alert('Free tier limit reached', 'Upgrade to PRO to unlock more generations.');
		} else {
			alert('Failed: ' + JSON.stringify(j));
		}
	}

	if (!token) {
		return (
			<SafeAreaView style={{ flex: 1 }}>
				<ScrollView contentContainerStyle={{ padding: 16 }}>
					<Text style={styles.title}>Welcome to JobBot</Text>
					<Text style={styles.subtitle}>Mobile Companion</Text>
					<Button
						mode="contained"
						onPress={() => promptAsync()}
						style={{ backgroundColor: '#4285f4' }}
					>
						Continue with Google
					</Button>
				</ScrollView>
			</SafeAreaView>
		);
	}

	return (
		<NavigationContainer>
			<Tab.Navigator screenOptions={{ headerShown: false }}>
				<Tab.Screen name="Generate" children={() => (
					<SafeAreaView style={{ flex: 1 }}>
						<ScrollView contentContainerStyle={{ padding: 16 }}>
							<Text style={{ fontSize: 20, marginBottom: 8 }}>Generate Resume Kit</Text>
							<TextInput label="Job URL" value={jobUrl} onChangeText={setJobUrl} style={{ marginTop: 12, marginBottom: 8 }} />
							<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
								<Button mode="outlined" onPress={pickResume} style={{ marginRight: 8 }}>Pick Resume</Button>
								<Text numberOfLines={1} style={{ flex: 1 }}>{pickedDoc ? pickedDoc.name : 'No file selected'}</Text>
							</View>
							<Button mode="contained" onPress={generate}>Generate</Button>
							{lastResult && (
								<View style={{ marginVertical: 12 }}>
									<Text>Resume: {lastResult.resumeUrl}</Text>
									<Text>Cover Letter: {lastResult.coverLetterUrl}</Text>
									{membershipStatus === 'FREE' && (
										<Text style={{ marginTop: 8 }}>ATS score shown: 75% (upgrade to see exact score)</Text>
									)}
								</View>
							)}
						</ScrollView>
					</SafeAreaView>
				)} />
				<Tab.Screen name="Jobs" component={JobsScreen} />
				<Tab.Screen name="Files" component={FilesScreen} />
				<Tab.Screen name="Portfolio" component={PortfolioScreen} />
				<Tab.Screen name="Jot" component={JotScreen} />
				<Tab.Screen name="Settings" children={() => (<SettingsScreen membershipStatus={membershipStatus} />)} />
			</Tab.Navigator>
		</NavigationContainer>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: 'gray',
		marginBottom: 16,
	},
});

function JobsScreen() {
	const [jobs, setJobs] = useState<any[]>([]);
	const [company, setCompany] = useState('');
	const [title, setTitle] = useState('');
	const [sourceUrl, setSourceUrl] = useState('');
	useEffect(() => { api('/jobs').then(r=>r.json()).then(setJobs).catch(()=>{}) }, []);
	async function addJob() {
		await api('/jobs', { method: 'POST', body: JSON.stringify({ company, title, sourceUrl }) });
		setCompany(''); setTitle(''); setSourceUrl('');
		const j = await api('/jobs').then(r=>r.json()); setJobs(j);
	}
	async function toggleApplied(id: string, applied: boolean) {
		await api(`/jobs/${id}`, { method: 'PATCH', body: JSON.stringify({ applied: !applied }) });
		const j = await api('/jobs').then(r=>r.json()); setJobs(j);
	}
	return (
		<SafeAreaView style={{ flex: 1 }}>
			<ScrollView contentContainerStyle={{ padding: 16 }}>
				<Text style={{ fontSize: 20, marginBottom: 8 }}>Job Logs</Text>
				<TextInput label="Company" value={company} onChangeText={setCompany} style={{ marginBottom: 8 }} />
				<TextInput label="Title" value={title} onChangeText={setTitle} style={{ marginBottom: 8 }} />
				<TextInput label="Source URL" value={sourceUrl} onChangeText={setSourceUrl} style={{ marginBottom: 8 }} />
				<Button mode="contained" onPress={addJob}>Add</Button>
				{jobs.map(j => (
					<View key={j.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
						<Text style={{ fontWeight: '600' }}>{j.company} — {j.title}</Text>
						{j.sourceUrl ? <Text>{j.sourceUrl}</Text> : null}
						<View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
							<Button compact onPress={() => toggleApplied(j.id, !!j.applied)}>{j.applied ? 'Mark Unapplied' : 'Mark Applied'}</Button>
						</View>
					</View>
				))}
			</ScrollView>
		</SafeAreaView>
	);
}

function FilesScreen() {
	const [files, setFiles] = useState<any[]>([]);
	useEffect(() => { api('/files').then(r=>r.json()).then(setFiles).catch(()=>{}) }, []);
	async function pickAndUpload() {
		const pick = await DocumentPicker.getDocumentAsync({ type: ['*/*'] });
		if (pick.canceled || !pick.assets?.[0]) return;
		const f = pick.assets[0];
		const form = new FormData();
		// @ts-ignore
		form.append('file', { uri: f.uri, name: f.name || 'upload', type: f.mimeType || 'application/octet-stream' });
		const token = await SecureStore.getItemAsync('jwt');
		await fetch(`${API_URL}/files/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form as any });
		const j = await api('/files').then(r=>r.json()); setFiles(j);
	}
	return (
		<SafeAreaView style={{ flex: 1 }}>
			<ScrollView contentContainerStyle={{ padding: 16 }}>
				<Text style={{ fontSize: 20, marginBottom: 8 }}>Files</Text>
				<Button mode="contained" onPress={pickAndUpload} style={{ marginBottom: 8 }}>Upload File</Button>
				{files.map(f => (
					<View key={f.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
						<Text>{f.name} ({Math.round(f.sizeBytes/1024)} KB)</Text>
					</View>
				))}
			</ScrollView>
		</SafeAreaView>
	);
}

function PortfolioScreen() {
	const [projects, setProjects] = useState<any[]>([]);
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [tagsCsv, setTagsCsv] = useState('');
	const [bulletsCsv, setBulletsCsv] = useState('');
	useEffect(() => { api('/projects').then(r=>r.json()).then(setProjects).catch(()=>{}) }, []);
	async function addProject() {
		await api('/projects', { method: 'POST', body: JSON.stringify({ title, description, tags: tagsCsv.split(',').map(s=>s.trim()).filter(Boolean), bullets: bulletsCsv.split(',').map(s=>s.trim()).filter(Boolean) }) });
		setTitle(''); setDescription(''); setTagsCsv(''); setBulletsCsv('');
		const j = await api('/projects').then(r=>r.json()); setProjects(j);
	}
	async function exportPdf(id: string) {
		const res = await api(`/projects/${id}/export-pdf`, { method: 'POST' });
		const j = await res.json();
		if (j?.url) Alert.alert('Exported', 'PDF available at: ' + j.url);
	}
	return (
		<SafeAreaView style={{ flex: 1 }}>
			<ScrollView contentContainerStyle={{ padding: 16 }}>
				<Text style={{ fontSize: 20, marginBottom: 8 }}>Portfolio</Text>
				<TextInput label="Project title" value={title} onChangeText={setTitle} style={{ marginBottom: 8 }} />
				<TextInput label="Description" value={description} onChangeText={setDescription} style={{ marginBottom: 8 }} />
				<TextInput label="Tags (comma-separated)" value={tagsCsv} onChangeText={setTagsCsv} style={{ marginBottom: 8 }} />
				<TextInput label="Bullets (comma-separated)" value={bulletsCsv} onChangeText={setBulletsCsv} style={{ marginBottom: 8 }} />
				<Button mode="contained" onPress={addProject}>Add Project</Button>
				{projects.map(p => (
					<View key={p.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
						<Text style={{ fontWeight: '600' }}>{p.title}</Text>
						<Text>{p.description}</Text>
						<Button compact onPress={() => exportPdf(p.id)}>Export PDF</Button>
					</View>
				))}
			</ScrollView>
		</SafeAreaView>
	);
}

function JotScreen() {
	const [note, setNote] = useState('');
	const [notes, setNotes] = useState<string[]>([]);
	return (
		<SafeAreaView style={{ flex: 1 }}>
			<ScrollView contentContainerStyle={{ padding: 16 }}>
				<Text style={{ fontSize: 20, marginBottom: 8 }}>Jot Bot</Text>
				<TextInput multiline label="Note" value={note} onChangeText={setNote} style={{ marginBottom: 8 }} />
				<Button mode="contained" onPress={() => { if (note.trim()) { setNotes([note.trim(), ...notes]); setNote(''); } }}>Save</Button>
				{notes.map((n, i) => (
					<View key={i} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
						<Text>{n}</Text>
					</View>
				))}
			</ScrollView>
		</SafeAreaView>
	);
}

function SettingsScreen({ membershipStatus }: { membershipStatus: string | null }) {
	const [email, setEmail] = useState<string>('');
	useEffect(() => { (async () => { const me = await api('/me').then(r=>r.json()).catch(()=>null); if (me?.email) setEmail(me.email) })(); }, []);
	return (
		<SafeAreaView style={{ flex: 1 }}>
			<ScrollView contentContainerStyle={{ padding: 16 }}>
				<Text style={{ fontSize: 20, marginBottom: 8 }}>Settings</Text>
				<Text>Account: {email}</Text>
				<Text>Membership: {membershipStatus}</Text>
			</ScrollView>
		</SafeAreaView>
	);
}
