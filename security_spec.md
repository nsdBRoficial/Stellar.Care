# Security Specification: StellarCare Authorization Laws (Zero-Trust)

This specification defines the access control guidelines and data invariants for our clinic management backend in Cloud Firestore, conforming strictly with attribute-based access control (ABAC).

## 1. Data Invariants (System Laws)

- **Identity Ownership**: A logged-in professional (`/users/{uid}`) is only allowed to read and write their own profile page.
- **Le BED/Setor Constraint**: Patient document IDs must be valid alphanumeric strings (`^[a-zA-Z0-9_\-]+$`) and cannot exceed 128 bytes to prevent Denial of Wallet index exhaustion attacks.
- **Status Terminal Lock**: Once a patient's status reaches a terminal values (`" alta"`, `"obito"`, `"transferido"`), they cannot be modified by standard users to ensure audit logs are safe from retroactive tampering.
- **Time Integrity**: The timestamp of any evolution metric change must be bound strictly to the server clock (`request.time`).
- **Relational Integrity**: Metric points must always contain a reference to a valid `paciente_id` associated with the collection path.

## 2. The "Dirty Dozen" Threat Payloads (Forbidden Actions)

1. **Self-Assigned Identity**: An operator tries to write a `/users/attacker` doc claiming `email = "admin@example.com"` using their own credentials.
2. **PII Bulk Harvesting**: An unauthorized authenticated operator tries to query or fetch private patient lists without filtering specifically by status or ID.
3. **Ghost Write (Orphaned Metrics)**: A user tries to create a metric document under `/patients/invalidPatientId/metrics/m1` where the target patient does not exist.
4. **Retroactive Audit Deletion**: An operator attempts to execute `delete` on an active or high-severity patient record.
5. **Time Spoofing**: A user submits a payload with a backdated or future-dated `createdAt` timestamp.
6. **Privilege Escalation**: A technician (`cargo = "TE"`) tries to rewrite their record to become an administrator (`cargo = "ENF"`).
7. **Junk ID Poisoning**: A user sends a 1.5KB string of malicious characters (`#../\__garbage__`) as a patient ID.
8. **Shadow Field Injection**: A user attempts to add an unmodeled `"isVerifiedInstitution"` metadata flag to bypass system roles.
9. **Terminal Edit bypass**: Standard user edits progress notes of a deceased patient (`status = "obito"`).
10. **Array Overflooding**: Submitting a list of allergens with more than 100 entries to consume firestore payload allocations.
11. **Anomalous Diuresis Spoof**: Writing boolean triggers using strings instead of proper booleans.
12. **Unauthorized Bed Migration**: Moving a patient's bed allocation by direct update without proper clinician authorization checks.

## 3. Test Invariants (Response expected)
All 12 threat-vectors must return a native Firebase `PERMISSION_DENIED` exception.
