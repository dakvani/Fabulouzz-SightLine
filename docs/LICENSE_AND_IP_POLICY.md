# FABULOUZZ SIGHTLINE — PROPRIETARY SOFTWARE LICENSE & INTELLECTUAL PROPERTY POLICY

**Copyright © 2026 Fabulouzz Technologies / DVHQ Innovations. All Rights Reserved.**  
**Document Reference:** LIC-IP-2026-SL-01  
**Classification:** Proprietary & Confidential  

---

## 1. PREAMBLE & STATEMENT OF PROPRIETARY OWNERSHIP

This Software License and Intellectual Property Policy ("Agreement") constitutes a legally binding agreement between **Fabulouzz Technologies / DVHQ Innovations** ("Licensor", "Company", "We") and any authorized corporate customer, contractor, licensee, or individual accessing or utilizing the software product known as **Fabulouzz SightLine** ("Software", "Platform", "SightLine").

The Software—including its source code, database architectures, PostgreSQL schemas, Row Level Security (RLS) triggers, Edge Functions, user interface designs, visual styling, icons, algorithms, telemetry routines, and accompanying technical documentation—is protected under international copyright treaties, trade secret statutes, and intellectual property conventions.

---

## 2. GRANT OF LIMITED COMMERCIAL LICENSE

Subject to timely payment of applicable subscription or enterprise contract fees and continuous adherence to this Agreement:

1. **Non-Exclusive, Non-Transferable License:** The Licensor grants the Licensee a limited, revocable, non-exclusive, non-transferable, and non-sublicensable license to access and operate the Software solely for its internal project monitoring, engineering supervision, and contractor-client collaboration purposes.
2. **Authorized User Limits:** Access is strictly bounded by the number of authorized user seats, roles (Super Admin, Admin, Project Manager, Client), and active project instances defined in the Licensee's commercial order schedule.
3. **White-Label Branding Rights (Where Licensed):** If licensed under the Enterprise or White-Label tier, Licensee is permitted to customize the presentation layer (company logo, accent color, letterhead) solely for presentation to its verified project clients. White-labeling does **not** convey intellectual property ownership or right of resale.

---

## 3. STRICT PROHIBITIONS & RESTRICTIONS ON USE

Except as expressly authorized in writing by an executive officer of Fabulouzz Technologies, the Licensee and any operator shall NOT:

1. **Reverse Engineer or Decompile:** Decompile, disassemble, reverse engineer, decrypt, extract source code, or attempt to derive the underlying algorithms, protocols, or schemas of the Software.
2. **Redistribute or Sub-license:** Sell, resell, rent, lease, sub-license, assign, distribute, time-share, or commercially exploit the Software as a service bureau or independent commercial offering to unauthorized third parties.
3. **Circumvent Security Controls:** Modify, circumvent, disable, or tamper with any authentication mechanism, Row Level Security (RLS) policy, role hierarchy, rate limiting, or session verification routines.
4. **Remove Proprietary Notices:** Remove, alter, obscure, or deface any copyright notices, trademark notices, digital watermarks, or proprietary legends embedded in the code, interfaces, or generated PDF reports.
5. **Create Competing Derivative Works:** Utilize the structure, data models, or operational workflows of SightLine to build, benchmark, or assist in building a competing project monitoring or command center product.

---

## 4. INTELLECTUAL PROPERTY & TRADE SECRET RESERVATION

### 4.1 Title & Ownership
Licensor retains all right, title, and interest—including all worldwide patent rights, copyrights, trademarks, service marks, trade dress, trade secrets, moral rights, and know-how—in and to the Software and any enhancements, patches, modifications, or derivatives thereof.

### 4.2 Trade Secrets
The following components are recognized as trade secrets of high commercial value:
- The Three-Tier Security Definer role resolution engine.
- The project isolation and automatic data sanitization routines ([`sanitizeForClient()`](file:///c:/Users/dakva/OneDrive/Documents/DVHQ-REPO/Fabulouzz-SightLine/src/lib/auth/permissions.ts)).
- The automated PDF telemetry and weather synthesis layout generator.
- The immutable tamper-evident audit logging architecture.

---

## 5. CLIENT & PROJECT DATA OWNERSHIP

1. **Licensee Data Retention:** The Licensee retains full ownership of all raw project data, proprietary architectural plans, task descriptions, and contractual documents uploaded to the Platform ("Customer Data").
2. **License to Host:** Licensee grants Licensor a limited, non-exclusive license to store, process, and transmit Customer Data solely to the extent necessary to deliver the features and reporting services of the Platform.
3. **Data Sanitization & Privacy:** Licensor guarantees that Customer Data will not be shared across tenant boundaries and is protected by encrypted storage and strict Row Level Security.

---

## 6. AUDIT RIGHTS & COMPLIANCE VERIFICATION

Licensor reserves the right, upon reasonable written notice, to conduct an audit of Licensee's utilization of the Software to ensure compliance with licensed seat counts, tier restrictions, and role privilege boundaries. In the event an audit reveals unauthorized utilization or license sharing, Licensee shall immediately remit payment for unbilled usage and the reasonable costs of the audit.

---

## 7. TERM, TERMINATION & SURVIVAL

1. **Termination for Cause:** Licensor may immediately terminate this license upon written notice if the Licensee breaches any provision of Sections 2, 3, or 4 of this Agreement, or fails to satisfy financial obligations within thirty (30) days of invoice maturity.
2. **Effects of Termination:** Upon termination, all access rights and licenses granted to Licensee shall cease immediately. Licensee must promptly discontinue all operation of the Software and permanently delete any locally deployed containers or cached runtime assets.
3. **Survival:** Sections 1, 3, 4, 5, 7, 8, and 9 shall survive any expiration or termination of this Agreement.

---

## 8. WARRANTY DISCLAIMER & LIMITATION OF LIABILITY

### 8.1 "AS-IS" Warranty
THE SOFTWARE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. LICENSOR DOES NOT WARRANT THAT THE FUNCTIONS CONTAINED IN THE SOFTWARE WILL MEET LICENSEE'S UNSTATED REQUIREMENTS OR THAT OPERATION WILL BE UNINTERRUPTED OR ERROR-FREE.

### 8.2 Limitation of Liability
TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL FABULOUZZ TECHNORIES, ITS DIRECTORS, EMPLOYEES, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES (INCLUDING LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES) ARISING OUT OF OR IN CONNECTION WITH THE SOFTWARE.

---

## 9. GOVERNING LAW & JURISDICTION

This Agreement shall be governed by and construed in accordance with the laws governing international commercial software contracts and the International Intellectual Property Conventions (Berne Convention, WCT, TRIPS). Any dispute, controversy, or claim arising under or relating to this Agreement shall be settled through binding arbitration conducted under the rules of the International Chamber of Commerce (ICC).

---

## 10. CONTACT & LEGAL INQUIRIES

For licensing inquiries, enterprise multi-tenant agreements, or copyright permissions, contact:

**Fabulouzz Technologies Legal & Intellectual Property Directorate**  
Email: `legal@fabulouzz.com` / `ip@dvhq.org`  
Official Web Portal: `https://sightline.fabulouzz.com`  
Repository Reference: `DVHQ-REPO/Fabulouzz-SightLine`  
*Fabulouzz Technologies. All Rights Reserved.*
