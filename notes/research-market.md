# Bulwark market research

Date of research: 2026-11-15.

Each factual claim has a source URL. "Secondary" marks a law-firm, vendor, or comparison-site source used where the primary text was not read in this run. Claims without a confirmed source are marked **unconfirmed**.

## 1. Regulations

### 1.1 EU Cyber Resilience Act (Regulation (EU) 2024/2847)

| Item | Status | Source |
|---|---|---|
| Article 14 reporting obligations apply from 11 September 2026 | Live as of 2026-11-15 (secondary) | https://www.crowell.com/en/insights/client-alerts/its-live-the-cyber-resilience-act-reporting-is-mandatory-as-of-today-11-september-2026 |
| Same date, cited to Article 71(2) | Secondary | https://zavodsky.org/en/intelligence/regulatory-radar/cyber-resilience-act-reporting-11-september-2026/ |
| Conflicting view: Article 14(1), (3), (8) apply from 11 December 2027 | One secondary source disagrees with the 2026 date | https://www.hlc.com/en/publications/eu-cyber-resilience-act-vulnerability-and-incident-reporting-obligations-now-apply |
| Full application of the Regulation from 11 December 2027 | Secondary | https://zavodsky.org/en/intelligence/regulatory-radar/cyber-resilience-act-reporting-11-september-2026/ |
| Reporting clock: 24 hours, 72 hours, final report 14 days after a corrective measure | Secondary | https://www.cyberresilienceact.eu/reporting.html |
| Primary text | EUR-Lex fetch returned only the first 100,000 of 384,769 characters, so Article 14, Article 71 and Annex I were not read from the primary text | https://eur-lex.europa.eu/eli/reg/2024/2847/oj/eng |

SBOM and vulnerability handling:

- Annex I, Part II, point (1) requires identifying and documenting components and vulnerabilities, including an SBOM in a commonly used machine-readable format covering at least top-level dependencies. The format is not named in the regulation. Applies from 11 December 2027. (Secondary: https://fossa.com/blog/sbom-requirements-cra-cyber-resilience-act/ and https://www.surecloud.com/blog-hub/eu-cyber-resilience-act-sbom-requirements)
- Annex I, Part II, points (2) to (5) cover addressing vulnerabilities without delay, regular security testing, disseminating information on fixed vulnerabilities, and a coordinated vulnerability disclosure policy. (Secondary: https://www.cyberresilienceact.eu/analysis.html)
- Explicit naming of static code analysis in the CRA: **unconfirmed** (not found in sources read).

### 1.2 IEC 62443-4-1 (secure product development lifecycle)

The standard text is paywalled. Practice areas below come from secondary guides.

| Practice area | Relevant practices | Source |
|---|---|---|
| Verification and validation testing | SVV-1 to SVV-5 (SVV-2 is threat mitigation testing). One vendor guide places static analysis under SVV. | https://nhimg.org/iec-62443-4-1-and-4-2-product-security-guide ; https://www.aebok.net/cybersecurity/iec-62443-4-1-clause-9-security-verification-and-validation-testing |
| Third-party components | SM-9, SM-10. Mapped to DM-1 and DM-3 in one CRA mapping. | https://nhimg.org/iec-62443-4-1-and-4-2-product-security-guide ; https://craci.com/iec-62443-4-1 |
| Security update management | SUM-1 to SUM-5 (qualifying, documenting and delivering security updates) | https://craci.com/iec-62443-4-1 |
| Security issue management | DM-1 to DM-6 (intake, assessment, remediation, disclosure, trend review) | https://craci.com/iec-62443-4-1 |
| Static analysis practice ID | **unconfirmed**. The SI (secure implementation) area is the likely location, not verified. | none |

### 1.3 NERC CIP-013 and CIP-010 (North American bulk electric system)

| Item | Status | Source |
|---|---|---|
| CIP-013-2 (supply chain risk management) approved by FERC on 18 March 2021 | Secondary | https://www.balch.com/insights/publications/2021/03/ferc-issues-order-approving-reliability ; standard text: https://www.nerc.com/globalassets/standards/reliability-standards/cip/cip-013-2.pdf |
| CIP-010-4 approved in the same order | Secondary | https://www.balch.com/insights/publications/2021/03/ferc-issues-order-approving-reliability |
| CIP-013 plan reviewed at least every 15 calendar months | Secondary | https://nhimg.org/nerc-cip-013-guide |
| Software integrity controls in CIP-010-4 Requirement R1, Part 1.6 | Secondary, wording not checked against the NERC text | https://www.balch.com/insights/publications/2021/03/ferc-issues-order-approving-reliability |
| FERC Order No. 912 directs NERC to strengthen CIP-005-7, CIP-010-4, CIP-013-2 | **unconfirmed** (secondary summary only, no URL isolated) | none |
| Replacement versions approved as of 2026-11-15 | **unconfirmed** (search found none; not exhaustive) | none |
| SBOM or static analysis named | Not named in sources read. Software integrity is named. | none |

### 1.4 NIS2 (Directive (EU) 2022/2555)

- Recital 85 says entities should assess suppliers' cybersecurity practices, including their secure development procedures. Recital 58 covers procedures to handle vulnerabilities when discovered. (EUR-Lex: https://eur-lex.europa.eu/eli/dir/2022/2555/oj/eng)
- The text of Article 21(2)(d) (supply chain security) and 21(2)(e) (acquisition, development and maintenance, including vulnerability handling and disclosure) was not read because the fetch covered only the recitals. Wording: **unconfirmed** in this run.
- Transposition deadline of 17 October 2024 (Article 41): **unconfirmed** in this run.
- SBOM or static analysis named: not found in sources read.

### 1.5 United States water utilities (AWIA 2018 section 2013, amending SDWA section 1433)

| Item | Status | Source |
|---|---|---|
| Risk and resilience assessments and emergency response plans must address cybersecurity | Confirmed by EPA pages as summarised in search (EPA states this in its 2026 pages) | https://www.epa.gov/waterresilience/addressing-natural-hazards-risk-and-resilience-assessments-and-emergency-response |
| Certification deadline 30 June 2026 for systems serving 3,301 to 49,999 people | Secondary; date has passed as of 2026-11-15 | https://www.burgessniple.com/regulatory-updates/2025/10/17/awia-section-2013-risk-and-resilience-assessments/ |
| Systems serving 3,300 or fewer, and wastewater and stormwater utilities, are not required to certify | Secondary | https://www.epa.gov/node/299267 |
| Federal enforcement status is disputed. One source says the proposed sanitary-survey cybersecurity mandate is dead. Another says EPA will step up enforcement. | Both secondary, unresolved | https://www.tenable.com/blog/water-utilities-cybersecurity-regulatory-compliance ; https://eclypsium.com/blog/epa-steps-up-cybersecurity-audits-for-water-systems/ |
| SBOM or static analysis named | Not found in sources read | none |

### 1.6 TSA pipeline security directives

| Item | Status | Source |
|---|---|---|
| SD Pipeline-2021-02G in force 3 May 2026 to 2 May 2027 | Primary TSA transmittal memo dated 1 May 2026 | https://www.tsa.gov/sites/default/files/signed_security_directive_pipeline-2021-02g_and_transmittal_memo_508c.pdf |
| 02G supersedes 02F with no substantive revisions | Primary TSA memo (same URL) | https://www.tsa.gov/sites/default/files/signed_security_directive_pipeline-2021-02g_and_transmittal_memo_508c.pdf |
| Performance-based regime with a TSA-approved Cybersecurity Implementation Plan | Secondary | https://www.opensecurityarchitecture.org/frameworks/tsa-psd/ |
| SD Pipeline-2021-01G (incident reporting, vulnerability assessment) runs 16 January 2026 to 15 January 2027 | Secondary, source not isolated | **unconfirmed** URL |
| SBOM or static analysis named | Not verified | none |

Scope note: this regime covers pipelines. It does not cover electric or water utilities, or EV charging operators.

## 2. Competitors and adjacent products

Public pricing is in section 5. "OT-protocol source rules" means published rules that flag insecure Modbus, DNP3, IEC 61850, IEC 60870-5-104, OCPP, OPC UA or BACnet code or configuration.

| Vendor | Category | What the sources say | OT-protocol source rules | Source |
|---|---|---|---|---|
| Dragos | OT network security | **unconfirmed** (no page read) | **unconfirmed** | none |
| Claroty | OT network security | **unconfirmed** (no page read) | **unconfirmed** | none |
| Nozomi Networks | OT network security | **unconfirmed** (no page read) | **unconfirmed** | none |
| Finite State | Firmware SBOM and product security for device makers | Commercial only, no free tier, no list price published | None found | https://appsecsanta.com/finite-state ; https://www.g2.com/products/finite-state/reviews |
| Cybellum | Product security and PSIRT | Pricing on request, no free plan | Not verified | https://www.itechguides.com/products/cybellum-platform/ |
| NetRise | Firmware SBOM and PSIRT | Pricing "not stated". One comparison site reports Dragos acquired NetRise on 21 September 2026. | Not verified | https://craci.com/alternatives/netrise (acquisition claim: **unconfirmed**, single source) |
| aDolus / FACT | Device product security | No results in search | **unconfirmed** | none |
| Snyk | General code security, SCA, autofix | Team plan from $25/month for up to 10 developers. Enterprise uses 1.0 credit per active contributor per day, 1 credit = $1 (calculated from the rate card). | None in the pages read | https://snyk.io/plans/ |
| Semgrep | SAST and SCA | Teams from $30/month per contributor (Code and Supply Chain), $15/month per contributor (Secrets). Free for up to 10 contributors. | None in the pages read | https://semgrep.dev/pricing |
| GitHub Advanced Security | SAST, secret scanning, Copilot Autofix | Code Security $30 per active committer per month. Secret Protection $19 per active committer per month. Copilot Autofix included on Team and Enterprise plans. Autofix languages listed: JavaScript, TypeScript, Java, Python. | None in the pages read | https://github.com/security/advanced-security ; https://github.com/pricing |
| Aikido | Code, cloud and SCA scanning with autofix | Developer tier free. Basic $300/month, Pro $600/month, Advanced $600/month, each including 10 users. Currency not shown on the page. | None in the pages read | https://www.aikido.dev/pricing |
| Endor Labs | Dependency and SCA | **unconfirmed** (not fetched) | **unconfirmed** | none |

Gap statement. No vendor page read in this run publishes OT-protocol source rules. The four general code scanners have no OT protocol rule set on their public pricing or product pages read here. This does not prove that no such rule exists in their catalogues. The gap that an OT-focused source scanner could fill is protocol-level checks in utility, charger and building automation code, for example OCPP over plaintext ws:// or without station authentication (see section 3.2), Modbus or DNP3 without authentication, anonymous OPC UA sessions, and BACnet without security. These checks are not in the general scanners' public material read here.

## 3. Evidence that insecure OT software is a recurring problem

### 3.1 CISA ICS advisories

| Metric | Value | Source |
|---|---|---|
| Advisories published in 2025 | Over 450 (SOCRadar) | https://socradar.io/blog/cisa-industrial-control-systems-ics-advisories-2025/ |
| Advisories published in 2025 | 508, a 20% rise on 2024 (EmberOT, citing its own report). Counts differ by method. CISA's own listing was not checked. | https://www.emberot.com/newsroom/ot-vulnerability-intelligence-report/ |
| Share of vulnerabilities with a CISA advisory | 28.3% in 2024, 17.5% in 2025 (EmberOT) | https://www.emberot.com/newsroom/ot-vulnerability-intelligence-report/ |
| Most-advised vendor | Siemens, 275 advisories in 2025 (SOCRadar) | https://socradar.io/blog/cisa-industrial-control-systems-ics-advisories-2025/ |
| CVEs tied to ICS advisories in 2025 | 2,065 (SOCRadar) | https://socradar.io/blog/cisa-industrial-control-systems-ics-advisories-2025/ |
| 2026 year-to-date count | **unconfirmed** | none |

### 3.2 Common weakness classes

- No verified ranked CWE tally for ICS advisories was found in this run. Relative frequency of CWE-798 (hard-coded credentials), CWE-306 (missing authentication) and CWE-319 (cleartext transmission) is **unconfirmed**.
- SOCRadar describes input handling and memory safety as the most common weakness types, without a ranked list. (https://socradar.io/blog/cisa-industrial-control-systems-ics-advisories-2025/)
- CWE-306 appears in the 2026 Everon OCPP advisory (see 3.3). The CISA advisory page was not fetched directly, so this rests on a secondary summary.

### 3.3 Named incidents and advisories

1. Unitronics Vision Series PLC and HMI campaign (AA23-335A)
   - Published 1 December 2023, last revised 18 December 2024.
   - Attackers authenticated to internet-connected devices using default or no passwords.
   - At least 34 US water and wastewater sector victims, out of at least 75 devices across critical infrastructure.
   - The advisory maps the activity to ATT&CK T1110 and T1078.001. It does not list a CWE, and it does not state the default password.
   - Source: https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-335a

2. OCPP and EV charging backends, 2026 (secondary summaries of CISA and vendor advisories)
   - ICSA-26-057-07, EV Energy: CVE-2026-27772. An unauthenticated attacker can connect to the OCPP WebSocket endpoint with a known or discovered station identifier. Source: https://www.cisa.gov/news-events/ics-advisories/icsa-26-057-07
   - ICSA-26-062-08, Everon OCPP backends: CVE-2026-26288, CWE-306, CVSS 9.4. Per the secondary summary, the platform shut down on 1 December 2025. Source: https://www.cisa.gov/news-events/ics-advisories/icsa-26-062-08
   - CVE-2026-29796: WebSocket OCPP endpoints accept connections without authentication, CVSS 9.3. Source: https://www.sentinelone.com/vulnerability-database/cve-2026-29796/
   - CVE-2026-44101: CHARX OCPP agent accepts backend reconfiguration without authentication, CVSS 9.3. Source: https://www.sentinelone.com/vulnerability-database/cve-2026-44101/
   - CERT-VDE VDE-2026-008 (CVE-2026-44098, CVE-2026-44102): secondary summaries only. The CERT-VDE advisory was not read.
   - Caveat: CVE and CVSS values come from aggregator pages, and two sources disagree on the CVE mapping for some EV2GO and Everon entries. Check the CISA pages before quoting numbers.

3. Modbus internet exposure: **unconfirmed** (no source read in this run).

## 4. Data sources for a scanner

### 4.1 CISA Known Exploited Vulnerabilities (KEV)

- JSON feed: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
- CSV feed: https://www.cisa.gov/sites/default/files/csv/known_exploited_vulnerabilities.csv
- JSON schema: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities_schema.json
- Catalog size on the page at fetch time: 1,781 entries. Source: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- Licence: the page links https://www.cisa.gov/sites/default/files/licenses/kev/license.txt. The licence text was not read. Terms: **unconfirmed**.

### 4.2 CISA ICS advisories in CSAF 2.0

- Repository: https://github.com/cisagov/CSAF. It holds CISA IT and OT advisories in CSAF 2.0 format and republishes partner vendor CSAF files with original dates and revision history. It also includes a csaf2md converter.
- Provider metadata: https://www.cisa.gov/sites/default/files/csaf/provider-metadata.json
- Licence on the repository page: not stated in the content read. Terms: **unconfirmed**.
- Per-feed URL for ICS advisories in CSAF: **unconfirmed** (not read).

### 4.3 OSV.dev

- Query endpoint: POST /v1/query. OpenAPI specification: https://osv.dev/docs/osv_service_v1.swagger.json. Source: https://google.github.io/osv.dev/api/
- Full API base URL: **unconfirmed** in this run.
- Bulk data bucket URL and data licence: **unconfirmed** in this run. The Data sources page (https://osv.dev/data/) was not read.

### 4.4 EPSS (FIRST)

- Endpoint verified in this run: GET https://api.first.org/data/v1/epss?cve=CVE-2021-44228. Response fields: status, status-code, version, access, total, offset, limit, data (cve, epss, percentile, date). Test response dated 2026-11-15 gave epss 0.99999.
- Terms: the FAQ states scores are published freely with no registration and that attribution is requested (secondary: https://casrai.org/guides/epss).
- Licence: sources disagree (CC0, CC-BY 4.0, or a FIRST usage agreement). Not resolved. Check https://www.first.org/epss/ before redistribution.
- Rate limit of 1,000 requests per minute: reported by one third-party project, **unconfirmed**.
- Bulk CSV URL and date parameter: **unconfirmed** in this run.

## 5. Pricing benchmarks (2026)

None of the four pricing pages shows an effective date. The only date on each page is the footer copyright (2026).

| Product | Plan | Published price | Unit | Source |
|---|---|---|---|---|
| Snyk | Free | $0 | Flat | https://snyk.io/plans/ |
| Snyk | Team | from $25/month | Up to 10 developers | https://snyk.io/plans/ |
| Snyk | Enterprise | Rate card 1.0 credit per active contributor per day, 1 credit = $1 (calculated, not a published per-seat price) | Per active contributor per day | https://snyk.io/plans/ |
| Semgrep | Free | $0 | Up to 10 contributors | https://semgrep.dev/pricing |
| Semgrep | Teams | from $30/month (Code and SCA), $15/month (Secrets) | Per contributor | https://semgrep.dev/pricing |
| Semgrep | Enterprise | Not published | n/a | https://semgrep.dev/pricing |
| GitHub | Code Security | $30/month | Per active committer | https://github.com/security/advanced-security |
| GitHub | Secret Protection | $19/month | Per active committer | https://github.com/security/advanced-security |
| Aikido | Developer | $0 | Free tier, 2 users, 10 repos | https://www.aikido.dev/pricing |
| Aikido | Basic | $300/month | Total, includes 10 users | https://www.aikido.dev/pricing |
| Aikido | Pro | $600/month | Total, includes 10 users | https://www.aikido.dev/pricing |
| Aikido | Advanced | $600/month | Total, includes 10 users | https://www.aikido.dev/pricing |
| Aikido | Enterprise | Not published | n/a | https://www.aikido.dev/pricing |

Pricing for Dragos, Claroty, Nozomi, Finite State, Cybellum and NetRise: not published (section 2).

## 6. Ranked capabilities most likely to win and keep this buyer

The ranking is a judgment built on the facts above.

1. IEC 62443-4-1 and CRA evidence report per release. CRA Article 14 reporting has applied since 11 September 2026 (section 1.1), and the Annex I Part II vulnerability handling duties apply from 11 December 2027. IEC 62443-4-1 practice areas (SM, SUM, DM, SVV) give a structure that findings can be mapped to (section 1.2).
2. SBOM export in a machine-readable format covering at least top-level dependencies. Named in CRA Annex I Part II point (1) (section 1.1). Buyers need it before the 11 December 2027 date. The format is not named in the regulation, so CycloneDX and SPDX export would cover the common readings (secondary: https://anchore.com/sbom/eu-cra/).
3. KEV and EPSS-prioritised dependency findings. The KEV feed has 1,781 entries and is published as JSON and CSV (section 4.1). EPSS returns daily scores through a public API (section 4.4). Prioritisation by exploitation status cuts the number of findings that need action.
4. OT-protocol insecure-configuration rules with CWE mapping. Recurring 2026 OCPP authentication advisories (section 3.3) and the Unitronics default-credential campaign (section 3.3) show the failure classes. None of the general scanners read here publish an OT rule set (section 2). This is the main gap to fill.
5. CI gate with fix pull requests and waiver records. IEC 62443-4-1 verification and issue-handling practices (section 1.2) require testing and tracked remediation. The general scanners already sell PR checks from $25 to $600 per month (section 5), so the gate is a baseline expectation and the OT rules are the differentiator.
6. Air-gapped Edge runner that sends findings only. Buyers in segmented utility and charger environments may need this. The requirement is not verified in any source read in this run, so the rank is lowest.

## 7. Unconfirmed items

- CRA Annex I explicit naming of static code analysis.
- CRA Article 14 and Article 71 text from the primary source (EUR-Lex fetch was truncated).
- IEC 62443-4-1 practice ID for static code analysis.
- NERC CIP-010-4 Part 1.6 exact wording; FERC Order No. 912 content and URL; replacement versions of CIP-013 or CIP-010.
- NIS2 Article 21(2)(d) and (e) wording; Article 41 transposition date.
- TSA SD Pipeline-2021-01G dates and URL.
- Whether any federal EPA cybersecurity enforcement mandate is in force.
- Dragos, Claroty, Nozomi functions and pricing; aDolus; Endor Labs.
- NetRise acquisition by Dragos on 21 September 2026 (single source).
- CWE frequency ranking for ICS advisories; 2026 year-to-date advisory count.
- Modbus internet exposure statistics.
- KEV licence terms; CSAF ICS feed URL and licence; OSV API base URL and data licence; EPSS licence, bulk CSV URL, and rate limit.
- Aikido pricing currency.
