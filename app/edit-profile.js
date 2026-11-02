import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { countries } from '../src/data/catalogue';
import { intentions } from '../src/data/intentions';
import { Dropdown } from '../src/components/Dropdown';
import { PlatformIcon } from '../src/components/PlatformIcon';
import { artistPlatforms, cleanArtistLinks, normalizePlatformLink, platformById } from '../src/data/artistPlatforms';
import { avatarUrl, supabase } from '../src/lib/supabase';
import { font } from '../src/theme';
import { useTheme } from '../src/state/ThemeState';
import { useApp } from '../src/state/AppState';

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const app = useApp();
  const [name, setName] = useState(app.firstName);
  const [intention, setIntention] = useState(app.intention || 'sleep');
  const [country, setCountry] = useState(app.country);
  const [preview, setPreview] = useState(avatarUrl(app.avatarPath));
  const [artistName, setArtistName] = useState(app.artistName || '');
  const [bio, setBio] = useState(app.artistBio || '');
  const [location, setLocation] = useState(app.artistLocation || '');
  const [tagline, setTagline] = useState(app.artistTagline || '');
  const [focus, setFocus] = useState(app.artistFocus || '');
  const [website, setWebsite] = useState(app.artistWebsite || '');
  const [links, setLinks] = useState(cleanArtistLinks(app.artistLinks));
  const [platform, setPlatform] = useState('');
  const [linkDraft, setLinkDraft] = useState('');
  const [banner, setBanner] = useState(app.artistBanner || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(app.firstName);
    setIntention(app.intention || 'sleep');
    setCountry(app.country);
    setPreview(avatarUrl(app.avatarPath));
    setArtistName(app.artistName || '');
    setBio(app.artistBio || '');
    setLocation(app.artistLocation || '');
    setTagline(app.artistTagline || '');
    setFocus(app.artistFocus || '');
    setWebsite(app.artistWebsite || '');
    setLinks(cleanArtistLinks(app.artistLinks));
    setBanner(app.artistBanner || '');
  }, [
    app.firstName,
    app.intention,
    app.country,
    app.avatarPath,
    app.artistName,
    app.artistBio,
    app.artistLocation,
    app.artistTagline,
    app.artistFocus,
    app.artistWebsite,
    app.artistLinks,
    app.artistBanner,
  ]);

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to add an avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setBusy(true);
    setError('');
    const asset = result.assets[0];
    const bytes = await fetch(asset.uri).then((response) => response.arrayBuffer());
    const path = `${app.userId}/avatar.jpg`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, bytes, {
      upsert: true,
      contentType: asset.mimeType || 'image/jpeg',
    });
    if (uploadError) {
      setBusy(false);
      setError('The photo could not be saved.');
      return;
    }
    const { error: updateError } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', app.userId);
    setBusy(false);
    if (updateError) {
      setError('The photo could not be saved.');
      return;
    }
    setPreview(`${avatarUrl(path)}?t=${Date.now()}`);
    app.refreshAccount();
  }

  async function chooseBanner() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to add a cover.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setBusy(true);
    setError('');
    try {
      const asset = result.assets[0];
      const bytes = await fetch(asset.uri).then((response) => response.arrayBuffer());
      const path = `${app.userId}/banner.jpg`;
      const uploaded = await supabase.storage.from('avatars').upload(path, bytes, {
        upsert: true,
        contentType: asset.mimeType || 'image/jpeg',
      });
      if (uploaded.error) throw uploaded.error;
      const saved = await supabase.rpc('save_artist_profile', {
        p_name: artistName.trim() || app.artistName || 'Artist',
        p_bio: bio.trim(),
        p_location: location.trim(),
        p_banner_path: path,
        p_set_banner: true,
        p_tagline: tagline.trim(),
        p_focus: focus.trim(),
        p_website: cleanWebsite(website) || '',
        p_links: links,
      });
      if (saved.error) throw saved.error;
      setBanner(path);
      await app.refreshAccount();
    } catch {
      setError('The cover could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  function addLink() {
    const url = normalizePlatformLink(platform, linkDraft);
    if (!platform) {
      setError('Choose where the link goes.');
      return;
    }
    if (!url) {
      setError(`That link has to be on ${platformById(platform)?.label}.`);
      return;
    }
    if (links.length >= 10) {
      setError('You can add 10 links.');
      return;
    }
    setLinks((items) => cleanArtistLinks([...items.filter((row) => row.platform !== platform), { platform, url }]));
    setPlatform('');
    setLinkDraft('');
    setError('');
  }

  async function save() {
    if (!name.trim()) {
      setError('Add your name.');
      return;
    }
    if (app.isArtist) {
      if (artistName.trim().length < 2) {
        setError('Add the name listeners should see.');
        return;
      }
      const site = cleanWebsite(website);
      if (website.trim() && !site) {
        setError('Use a full website address, like https://example.com.');
        return;
      }
    }

    setBusy(true);
    setError('');
    const { error: updateError } = await supabase.from('profiles').update({
      first_name: name.trim(),
      intention,
      country_code: country,
    }).eq('id', app.userId);
    if (updateError) {
      setBusy(false);
      setError('The profile could not be saved.');
      return;
    }

    if (app.isArtist) {
      const { error: artistError } = await supabase.rpc('save_artist_profile', {
        p_name: artistName.trim(),
        p_bio: bio.trim(),
        p_location: location.trim(),
        p_banner_path: null,
        p_set_banner: false,
        p_tagline: tagline.trim(),
        p_focus: focus.trim(),
        p_website: cleanWebsite(website) || '',
        p_links: links,
      });
      if (artistError) {
        setBusy(false);
        setError('Artist details could not be saved.');
        return;
      }
    }

    await app.refreshAccount();
    setBusy(false);
    router.replace('/(tabs)/profile');
  }

  const bannerUri = banner ? `${avatarUrl(banner)}?v=${app.avatarStamp}` : '';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Edit profile" back />

      {app.isArtist ? (
        <Pressable onPress={chooseBanner} accessibilityLabel="Change cover" style={styles.banner}>
          {bannerUri ? <Image source={{ uri: bannerUri }} resizeMode="cover" style={styles.bannerPhoto} /> : <Text style={styles.bannerText}>Add a banner</Text>}
        </Pressable>
      ) : null}

      <Pressable onPress={choosePhoto} style={styles.avatar}>
        {preview ? <Image source={{ uri: preview }} resizeMode="cover" style={styles.photo} /> : <Text style={styles.avatarText}>Add photo</Text>}
      </Pressable>

      <Text style={styles.label}>First name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor={colors.muted} />
      <Text style={styles.label}>Email</Text>
      <Text style={styles.locked}>{app.email}</Text>

      <View style={styles.drop}>
        <Dropdown
          label="What you come here for"
          value={intention}
          options={intentions.map((item) => ({ value: item.id, label: item.label }))}
          onChange={setIntention}
        />
      </View>
      <View style={styles.drop}>
        <Dropdown
          label="Country"
          value={country}
          options={countries.map((item) => ({ value: item.code, label: item.name }))}
          onChange={setCountry}
        />
      </View>

      {app.isArtist ? (
        <View style={styles.artistBlock}>
          <Text style={styles.section}>Artist page</Text>
          <Field label="Artist name" value={artistName} onChangeText={setArtistName} placeholder="Name listeners should see" />
          <Field label="Where you are" value={location} onChangeText={setLocation} placeholder="City or country" />
          <Field label="One line" value={tagline} onChangeText={setTagline} placeholder="Quiet rain for late nights" maxLength={80} />
          <Field label="Sounds you make" value={focus} onChangeText={setFocus} placeholder="Sleep, focus, rain" maxLength={80} />
          <Field label="Website" value={website} onChangeText={setWebsite} placeholder="https://example.com" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
          <Text style={styles.fieldLabel}>Links</Text>
          <Text style={styles.hint}>Choose a place, then add the link. Listeners only see the icon.</Text>
          {links.map((item) => (
            <View key={item.platform} style={styles.linkRow}>
              <PlatformIcon platform={item.platform} color={colors.mint} />
              <View style={styles.linkCopy}>
                <Text style={styles.linkName}>{platformById(item.platform)?.label}</Text>
                <Text style={styles.linkUrl} numberOfLines={1}>{item.url}</Text>
              </View>
              <Pressable onPress={() => setLinks((items) => items.filter((row) => row.platform !== item.platform))} hitSlop={8}>
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>
          ))}
          {links.length < 10 ? (
            <>
              <Dropdown
                label="Where it goes"
                value={platform}
                options={artistPlatforms.filter((item) => !links.some((row) => row.platform === item.id)).map((item) => ({ value: item.id, label: item.label }))}
                onChange={(value) => {
                  setPlatform(value);
                  setLinkDraft('');
                  setError('');
                }}
              />
              {platform ? (
                <Field
                  label={`${platformById(platform)?.label} link`}
                  value={linkDraft}
                  onChangeText={setLinkDraft}
                  placeholder="https://"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              ) : null}
              {platform ? (
                <Pressable onPress={addLink} style={styles.addLink}>
                  <Text style={styles.addLinkText}>Add link</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
          <Text style={styles.fieldLabel}>Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="A longer note about you and the sounds"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.bio]}
            multiline
            maxLength={280}
          />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={save} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? 'Saving' : 'Save'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function cleanWebsite(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    if (!url.hostname.includes('.')) return '';
    return withScheme;
  } catch {
    return '';
  }
}

function Field({ label, ...props }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput {...props} placeholderTextColor={colors.muted} style={styles.input} />
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 40 },
    banner: {
      marginHorizontal: 20,
      height: 140,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    bannerPhoto: { width: '100%', height: 140 },
    bannerText: { color: colors.mint, fontFamily: font.medium, fontSize: 15 },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 2,
      borderColor: colors.mint,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      marginBottom: 18,
      backgroundColor: colors.card,
    },
    photo: { width: 92, height: 92, borderRadius: 46 },
    avatarText: { color: colors.mint, fontFamily: font.medium, fontSize: 13 },
    drop: { marginHorizontal: 20, marginTop: 16 },
    label: { color: colors.muted, fontFamily: font.medium, fontSize: 13, marginHorizontal: 20, marginBottom: 6 },
    input: {
      marginHorizontal: 20,
      marginBottom: 14,
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: colors.card,
      color: colors.text,
      fontFamily: font.regular,
      fontSize: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    locked: { color: colors.text, fontFamily: font.regular, fontSize: 16, marginHorizontal: 20, marginBottom: 16 },
    artistBlock: { marginTop: 8, gap: 4 },
    section: {
      color: colors.text,
      fontFamily: font.bold,
      fontSize: 20,
      marginHorizontal: 20,
      marginTop: 10,
      marginBottom: 8,
    },
    field: { gap: 6 },
    fieldLabel: { color: colors.muted, fontFamily: font.medium, fontSize: 13, marginHorizontal: 20 },
    hint: { color: colors.muted, fontFamily: font.regular, fontSize: 13, lineHeight: 18, marginHorizontal: 20, marginBottom: 8 },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginHorizontal: 20,
      marginBottom: 8,
    },
    linkCopy: { flex: 1 },
    linkName: { color: colors.text, fontFamily: font.medium, fontSize: 14 },
    linkUrl: { color: colors.muted, fontFamily: font.regular, fontSize: 12, marginTop: 2 },
    addLink: { alignSelf: 'flex-start', marginHorizontal: 20, marginBottom: 10 },
    addLinkText: { color: colors.mint, fontFamily: font.semibold, fontSize: 14 },
    bio: { minHeight: 88, textAlignVertical: 'top' },
    error: { color: colors.amber, fontFamily: font.regular, marginHorizontal: 20, marginBottom: 8 },
    button: {
      marginHorizontal: 20,
      marginTop: 12,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.mint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 16 },
  });
}
