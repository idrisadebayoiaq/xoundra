import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Dropdown } from '../../src/components/Dropdown';
import { PlatformIcon } from '../../src/components/PlatformIcon';
import { artistPlatforms, cleanArtistLinks, normalizePlatformLink, platformById } from '../../src/data/artistPlatforms';
import { colors, font } from '../../src/theme';
import { useApp } from '../../src/state/AppState';
import { Avatar } from '../../src/components/Avatar';
import { avatarUrl, supabase } from '../../src/lib/supabase';

export default function ProfileScreen() {
  const app = useApp();
  const { premium, firstName, isAdmin, isArtist, avatarPath, avatarStamp, artistName, artistBio, artistLocation, artistTagline, artistFocus, artistWebsite, artistLinks, artistBanner } = app;
  const [name, setName] = useState(artistName || '');
  const [bio, setBio] = useState(artistBio || '');
  const [location, setLocation] = useState(artistLocation || '');
  const [tagline, setTagline] = useState(artistTagline || '');
  const [focus, setFocus] = useState(artistFocus || '');
  const [website, setWebsite] = useState(artistWebsite || '');
  const [links, setLinks] = useState(cleanArtistLinks(artistLinks));
  const [platform, setPlatform] = useState('');
  const [linkDraft, setLinkDraft] = useState('');
  const [banner, setBanner] = useState(artistBanner || '');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    if (!isArtist || filled) return;
    setName(artistName || '');
    setBio(artistBio || '');
    setLocation(artistLocation || '');
    setTagline(artistTagline || '');
    setFocus(artistFocus || '');
    setWebsite(artistWebsite || '');
    setLinks(cleanArtistLinks(artistLinks));
    setBanner(artistBanner || '');
    if (artistName) setFilled(true);
  }, [isArtist, artistName, artistBio, artistLocation, artistTagline, artistFocus, artistWebsite, artistLinks, artistBanner, filled]);
  const rows = [
    ...(isArtist ? [{ label: 'Artist dashboard', icon: 'mic-outline', href: '/artist' }] : []),
    { label: 'Edit profile', icon: 'create-outline', href: '/edit-profile' },
    ...(isAdmin ? [{ label: 'Admin', icon: 'shield-checkmark-outline', href: '/admin' }] : []),
    { label: 'Downloads', icon: 'download-outline', href: '/downloads' },
    { label: 'Sleep timer', icon: 'moon-outline', href: '/sleep' },
    { label: 'Studio', icon: 'layers-outline', href: '/studio' },
    { label: 'Privacy', icon: 'lock-closed-outline', href: '/privacy' },
    { label: 'Country', icon: 'globe-outline', href: '/country' },
    { label: 'Settings', icon: 'settings-outline', href: '/settings' },
  ];

  function addLink() {
    const url = normalizePlatformLink(platform, linkDraft);
    if (!platform) {
      setNotice('Choose where the link goes.');
      return;
    }
    if (!url) {
      setNotice(`That link has to be on ${platformById(platform)?.label}.`);
      return;
    }
    if (links.length >= 10) {
      setNotice('You can add 10 links.');
      return;
    }
    setLinks((items) => cleanArtistLinks([...items.filter((row) => row.platform !== platform), { platform, url }]));
    setPlatform('');
    setLinkDraft('');
    setNotice('');
  }

  async function saveArtist() {
    if (name.trim().length < 2) {
      setNotice('Add the name listeners should see.');
      return;
    }
    const site = cleanWebsite(website);
    if (website.trim() && !site) {
      setNotice('Use a full website address, like https://example.com.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc('save_artist_profile', {
      p_name: name.trim(),
      p_bio: bio.trim(),
      p_location: location.trim(),
      p_banner_path: null,
      p_set_banner: false,
      p_tagline: tagline.trim(),
      p_focus: focus.trim(),
      p_website: site,
      p_links: links,
    });
    setBusy(false);
    if (error) {
      setNotice('Those details could not be saved.');
      return;
    }
    await app.refreshAccount();
    setNotice('Saved.');
  }

  async function chooseBanner() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setNotice('Allow photo access to add a cover.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    setBusy(true);
    try {
      const asset = result.assets[0];
      const bytes = await fetch(asset.uri).then((response) => response.arrayBuffer());
      const path = `${app.userId}/banner.jpg`;
      const uploaded = await supabase.storage.from('avatars').upload(path, bytes, { upsert: true, contentType: asset.mimeType || 'image/jpeg' });
      if (uploaded.error) throw uploaded.error;
      const saved = await supabase.rpc('save_artist_profile', {
        p_name: name.trim() || artistName || 'Artist',
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
      setNotice('Cover updated.');
    } catch {
      setNotice('The cover could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  const bannerUri = banner ? `${avatarUrl(banner)}?v=${avatarStamp}` : '';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Profile" />
      {isArtist ? (
        <Pressable onPress={chooseBanner} accessibilityLabel="Change cover" style={styles.banner}>
          {bannerUri ? <Image source={{ uri: bannerUri }} resizeMode="cover" style={styles.bannerPhoto} /> : <Text style={styles.bannerText}>Add a cover</Text>}
        </Pressable>
      ) : null}
      <View style={styles.identity}>
        <Pressable onPress={() => router.push('/edit-profile')} accessibilityLabel="Edit profile photo">
          <Avatar path={avatarPath} stamp={avatarStamp} size={84} />
        </Pressable>
        <View style={styles.who}>
          <Text style={styles.name}>{isArtist ? (artistName || 'Artist') : (firstName || 'You')}</Text>
          <View style={[styles.badge, !premium && styles.badgeFree]}>
            <Text style={[styles.badgeText, !premium && styles.badgeTextFree]}>
              {premium ? 'Premium' : 'Free'}
            </Text>
          </View>
        </View>
      </View>
      {isArtist ? (
        <View style={styles.artistForm}>
          <Field label="Artist name" value={name} onChangeText={setName} placeholder="Name listeners should see" accessibilityLabel="Artist name" />
          <Field label="Where you are" value={location} onChangeText={setLocation} placeholder="City or country" accessibilityLabel="Location" />
          <Field label="One line" value={tagline} onChangeText={setTagline} placeholder="Quiet rain for late nights" accessibilityLabel="One line" maxLength={80} />
          <Field label="Sounds you make" value={focus} onChangeText={setFocus} placeholder="Sleep, focus, rain" accessibilityLabel="Sounds you make" maxLength={80} />
          <Field label="Website" value={website} onChangeText={setWebsite} placeholder="https://example.com" accessibilityLabel="Website" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
          <Text style={styles.fieldLabel}>Links</Text>
          <Text style={styles.hint}>Choose a place, then add the link. Listeners only see the icon. You can add 10.</Text>
          {links.map((item) => (
            <View key={item.platform} style={styles.linkRow}>
              <PlatformIcon platform={item.platform} color={colors.mint} />
              <View style={styles.linkCopy}>
                <Text style={styles.linkName}>{platformById(item.platform)?.label}</Text>
                <Text style={styles.linkUrl} numberOfLines={1}>{item.url}</Text>
              </View>
              <Pressable onPress={() => setLinks((items) => items.filter((row) => row.platform !== item.platform))} accessibilityLabel={`Remove ${platformById(item.platform)?.label}`} hitSlop={8}>
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
                  setNotice('');
                }}
              />
              {platform ? (
                <Field
                  label={`${platformById(platform)?.label} link`}
                  value={linkDraft}
                  onChangeText={setLinkDraft}
                  placeholder="https://"
                  accessibilityLabel="Link"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              ) : null}
              {platform ? (
                <Pressable onPress={addLink} accessibilityLabel="Add link" style={styles.addLink}>
                  <Text style={styles.addLinkText}>Add link</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
          <Text style={styles.fieldLabel}>Bio</Text>
          <TextInput value={bio} onChangeText={setBio} placeholder="A longer note about you and the sounds" placeholderTextColor={colors.muted} style={[styles.input, styles.bio]} multiline accessibilityLabel="Bio" maxLength={280} />
          <Pressable onPress={saveArtist} disabled={busy} accessibilityLabel="Save artist details" style={styles.save}>
            <Text style={styles.saveText}>{busy ? 'Saving' : 'Save artist page'}</Text>
          </Pressable>
          <Pressable onPress={() => router.push({ pathname: '/artist-page', params: { id: app.userId } })} accessibilityLabel="Preview public page">
            <Text style={styles.link}>Preview how listeners see you</Text>
          </Pressable>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        </View>
      ) : null}
      <View style={styles.list}>
        {rows.map((row) => (
          <Pressable key={row.label} style={styles.row} onPress={() => router.push(row.href)}>
            <Ionicons name={row.icon} size={20} color={colors.muted} />
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>
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
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput {...props} placeholderTextColor={colors.muted} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 28 },
  banner: {
    marginHorizontal: 20,
    height: 140,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  bannerPhoto: { width: '100%', height: 140 },
  bannerText: { color: colors.mint, fontFamily: font.medium, fontSize: 15 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  artistForm: { paddingHorizontal: 20, gap: 10, marginBottom: 18 },
  field: { gap: 6 },
  fieldLabel: { color: colors.muted, fontFamily: font.medium, fontSize: 13 },
  hint: { color: colors.muted, fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  linkCopy: { flex: 1 },
  linkName: { color: colors.text, fontFamily: font.medium, fontSize: 14 },
  linkUrl: { color: colors.muted, fontFamily: font.regular, fontSize: 12, marginTop: 2 },
  addLink: { alignSelf: 'flex-start' },
  addLinkText: { color: colors.mint, fontFamily: font.semibold, fontSize: 14 },
  input: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.card,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bio: { minHeight: 88, textAlignVertical: 'top' },
  save: { alignSelf: 'flex-start', backgroundColor: colors.mint, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  saveText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 14 },
  link: { color: colors.mint, fontFamily: font.medium, fontSize: 14 },
  notice: { color: colors.amber, fontFamily: font.regular, fontSize: 14 },
  who: { gap: 8 },
  name: {
    color: colors.text,
    fontFamily: font.bold,
    fontSize: 28,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.mint,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeFree: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.mint,
  },
  badgeText: {
    color: colors.mintInk,
    fontFamily: font.semibold,
    fontSize: 13,
  },
  badgeTextFree: {
    color: colors.mint,
  },
  list: {
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowLabel: {
    flex: 1,
    color: colors.text,
    fontFamily: font.medium,
    fontSize: 16,
  },
});
