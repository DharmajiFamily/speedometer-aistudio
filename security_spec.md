# Security Specification — ChargerLink Telemetry & Maps

## 1. Data Invariants
1. **Strict User Isolation**: Every vehicle telemetry document under `/users/{userId}/vehicles/{vehicleId}` and every trip log under `/users/{userId}/vehicles/{vehicleId}/trips/{tripId}` belongs strictly to the verified Google-authenticated user (`request.auth.uid == userId && request.auth.token.email_verified == true`).
2. **Ownership & Parent Integrity**: `ownerId` must equal `request.auth.uid` on creation and remain immutable forever (`incoming().ownerId == existing().ownerId`). Trip logs must reference an existing parent vehicle owned by `request.auth.uid` via `get()`.
3. **Strict Key Allowlists**: Both `create` and `update` reject shadow/ghost keys via `keys().hasAll(...)`, `keys().hasOnly(...)`, and `diff().affectedKeys().hasOnly(...)`.
4. **Numeric & String Bounds**: Speed (`0..250`), RPM (`0..8000`), coordinates (`-90..90`, `-180..180`), heading (`0..360`), and string lengths are strictly bounded to prevent resource exhaustion.
5. **Server Timestamp Enforcement**: `createdAt` and `updatedAt` must equal `request.time`; `createdAt` is immutable after creation.
6. **Immutable Trip History**: Completed `TripLog` documents cannot be altered once saved (`allow update: if false`).

## 2. Adversarial "Dirty Dozen" Payloads (All Expected: PERMISSION_DENIED)
1. **Unauthenticated Write**: `request.auth == null` writing to `/users/u1/vehicles/charger-01`.
2. **Unverified Email Token**: `request.auth.token.email_verified == false` attempting write.
3. **Cross-Tenant Spoofing**: User `u2` writing to `/users/u1/vehicles/charger-01` with `ownerId: "u1"`.
4. **OwnerId Hijack**: User `u1` creating `/users/u1/vehicles/charger-01` with `ownerId: "u2"`.
5. **Shadow/Ghost Field Injection**: Creating `VehicleTelemetry` with extra `"isAdmin": true` key.
6. **Invalid Document ID Poisoning**: Creating vehicle with ID `"../../etc/passwd"` or 200-char ID.
7. **Speed Out-of-Range Poisoning**: Setting `speedMph: 999999` or negative speed `-10`.
8. **Invalid Drive Mode Enum**: Setting `driveMode: "ludicrous"` instead of `street | sport | track`.
9. **Client Timestamp Forgery**: Setting `createdAt` or `updatedAt` to a past timestamp instead of `serverTimestamp()`.
10. **Immutable Field Mutation**: Updating `createdAt` or `ownerId` on an existing `VehicleTelemetry` doc.
11. **Unbounded Route Array Exhaustion**: Creating a `TripLog` with `routePoints.size() == 500` (exceeds max 60).
12. **Orphaned Trip Creation**: Creating a `TripLog` under a non-existent `vehicleId`.
