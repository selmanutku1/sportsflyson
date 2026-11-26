# Security Specification: SportsFly Multi-Tenant Firestore Collections

## 1. Data Invariants
- **Tenant & Identity Isolation**: Every club workspace document (`sporcular`, `egitmenler`, `gruplar`, `/gruplar/{grupId}/uyeler`, `yoklamalar`, `muhasebe_hareketler`, `muhasebe_kategoriler`, `odeme_planlari`, `antrenmanlar`, `anketler`, `destek_talepleri`, `on_kayitlar`, `subeler`, `sporpuan_logs`, `yoklama_hatirlatici_logs`, `club_settings`, `egitim_planlari`, `yoneticiler`, `kulup_sozlesmeleri`, `sporcu_sozlesmeleri`) MUST carry a valid `ownerId` matching `request.auth.uid` on creation (unless created by bootstrapped Super Admin `isAdmin()`), and `ownerId` MUST remain immutable across updates.
- **Path & ID Binding**: Every document MUST verify `isValidId(docId)` and `incoming().id == docId` on creation and `incoming().id == existing().id` on update.
- **Temporal Integrity**: `createdAt` MUST equal `request.time` on creation and remain immutable on update; `updatedAt` MUST equal `request.time` on both creation and update.
- **Strict Field & Array Bounds**: Every entity validation helper enforces `data.keys().hasAll(...) && data.keys().hasOnly(...)` on all writes, bounded string `.size()`, bounded array `.size() <= MAX` with element-0 type checks, and zero `JSON.stringify` blob serialization.
- **Admin Privilege Guard**: `isAdmin()` strictly requires `isNonAnonymousUser()` plus verified email (`selmanutkumarmara@gmail.com` with `email_verified == true`) or `/admins/$(uid)` membership. Non-admin users cannot escalate `role`, `isFullAccess`, or `allowedPages` in `/users/{uid}` or `/googleUsers/{uid}`.

## 2. The "Dirty Dozen" Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Write**: Any write where `request.auth == null`.
2. **Owner Spoofing**: Creating a record in `/sporcular/{id}` or `/muhasebe_hareketler/{id}` with `ownerId != request.auth.uid`.
3. **Immutable Owner Mutation**: Updating an existing document and attempting to change `ownerId` or `createdAt` or `id`.
4. **Ghost / Shadow Field Injection**: Sending `{ ...validPayload, isAdmin: true }` or `{ ...validPayload, hacked: 1 }` to any collection (blocked by `hasOnly`).
5. **Path ID Poisoning**: Creating `/yoklamalar/bad..id..with$$junk` or mismatched `incoming().id != docId`.
6. **Fake Client Timestamp**: Sending `createdAt: new Date(0)` instead of `serverTimestamp()` (`request.time`).
7. **Unverified Admin Email Spoofing**: Token claiming `email: 'selmanutkumarmara@gmail.com'` with `email_verified: false` or anonymous provider.
8. **Role Escalation via User Profile**: Non-admin user creating `/users/{uid}` with `role: 'kulup_yoneticisi'` or updating `role` / `allowedPages` / `isFullAccess` in `/googleUsers/{uid}`.
9. **Cross-Tenant List Scraping**: Querying `/sporcular`, `/muhasebe_hareketler`, `/on_kayitlar`, `/destek_talepleri`, or `/kulup_sozlesmeleri` without `where('ownerId', '==', uid)`.
10. **Parent-Child Desync**: Creating `/gruplar/{grupId}/uyeler/{uyeId}` referencing a non-existent `/gruplar/{grupId}` or a group owned by another `ownerId`.
11. **Oversized String / Base64 Blob Injection**: Sending a 10KB `avatarUrl` data URL or oversized text field exceeding blueprint `maxLength`.
12. **Unbounded Array Exhaustion**: Sending >20 `assignedGroupIds` on `egitmenler`, >50 `primaryAthleteIds` on `gruplar`, or >100 `records` entries on `yoklamalar`.

## 3. Test Runner Reference (`firestore.rules.test.ts`)
```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { serverTimestamp } from 'firebase/firestore';
import * as fs from 'fs';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'sportsfly-security-test',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

test('Denies unauthenticated read or write on operational collections', async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(db.collection('muhasebe_hareketler').doc('h-1').get());
  await assertFails(db.collection('yoklamalar').doc('y-1').set({ id: 'y-1' }));
});

test('Denies ownerId spoofing and ghost fields on create', async () => {
  const db = testEnv.authenticatedContext('club-user-1', { email_verified: true }).firestore();
  await assertFails(
    db.collection('subeler').doc('sube-1').set({
      id: 'sube-1',
      ownerId: 'victim-uid',
      ad: 'Sahte Şube',
      kod: 'SB-01',
      sehir: 'İstanbul',
      ilce: 'Kadıköy',
      durum: 'Aktif',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  await assertFails(
    db.collection('subeler').doc('sube-2').set({
      id: 'sube-2',
      ownerId: 'club-user-1',
      ad: 'Şube 2',
      kod: 'SB-02',
      sehir: 'İstanbul',
      ilce: 'Kadıköy',
      durum: 'Aktif',
      isAdminOverride: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
});

test('Allows valid owner-scoped operational write with serverTimestamp', async () => {
  const db = testEnv.authenticatedContext('club-user-1', { email_verified: true }).firestore();
  await assertSucceeds(
    db.collection('muhasebe_kategoriler').doc('cat-1').set({
      id: 'cat-1',
      ownerId: 'club-user-1',
      name: 'Sporcu Aidatları',
      type: 'Gelir',
      itemCount: 12,
      totalAmount: 42000,
      color: 'emerald',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
});
```
