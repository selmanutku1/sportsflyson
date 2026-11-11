# Security Specification: UploadedFile

## 1. Data Invariants
- An `UploadedFile` cannot exist without a valid `ownerId` belonging to the authenticated user.
- The `status` must be one of `['Bekliyor', 'İşlendi', 'Onaylandı']`.
- The `schoolName` and `name` must be non-empty and bounded.

## 2. The "Dirty Dozen" Payloads (Examples to deny)
1. Missing `ownerId`
2. `ownerId` != `request.auth.uid`
3. Empty `schoolName`
4. Invalid `status`
5. `athleteCount` < 0
6. Missing `uploadDate`
7. `name` too long
8. Extra "Ghost" field `isAdmin: true`
9. `uploadDate` in future (if logic allows)
10. `id` poison (junk characters)
11. `id` != document path ID
12. `createdAt` not `request.time`

## 3. Test Runner (Draft firestore.rules.test.ts)
```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'test-project',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });
});

test('Should deny creation of UploadedFile without ownerId', async () => {
  const db = testEnv.authenticatedContext('user1').firestore();
  await assertFails(db.collection('uploadedFiles').add({ name: 'file1', status: 'Bekliyor' }));
});

test('Should succeed creation of UploadedFile with ownerId', async () => {
  const db = testEnv.authenticatedContext('user1').firestore();
  await assertSucceeds(db.collection('uploadedFiles').doc('file1').set({
    id: 'file1',
    name: 'file1',
    athleteCount: 1,
    status: 'Bekliyor',
    schoolName: 'School1',
    uploadDate: new Date(),
    ownerId: 'user1'
  }));
});
```
