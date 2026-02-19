# Requirements Document: SanSure Platform

## Introduction

SanSure is a continuous rural sanitation intelligence platform that creates a self-sustaining infrastructure maintenance ecosystem through dual-signal architecture. The platform provides manipulation-resistant, market-priced functionality signals to capital markets while delivering health consequence feedback to rural households. By treating verification as a market design problem, SanSure enables financial signals to flow upstream to capital providers and health impact signals to flow downstream to households, making sanitation infrastructure maintenance economically viable and socially meaningful.

## Glossary

- **System**: The SanSure Platform
- **Hygiene_Score**: A 0-100 numerical assessment of toilet facility condition across four dimensions
- **Verification_Participant**: A CHW, peer, or ward auditor who submits facility assessments
- **Impact_Credit**: A fractional token representing verified person-days of functional sanitation
- **Volatility_Index**: Rolling 30-day standard deviation of hygiene scores for a village cluster
- **Trust_Rating**: Composite risk signal derived from hygiene scores, mesh integrity, and volatility
- **Health_Mirror**: Correlation engine pairing hygiene scores with health outcome predictions
- **Glass_Vault**: Append-only audit ledger storing all verification events
- **Collusion_Risk**: AI-assessed probability that verification participants coordinated submissions
- **Mesh_Integrity**: Statistical independence measure across three verification parties
- **ODF_Status**: Open Defecation Free certification status
- **Community_Maintenance_Fund**: Monthly disbursement pool funded by Impact Credit sales
- **Capital_Consumer**: CSR department, donor, or development bank consuming verification data
- **Spoofing_Risk**: AI-assessed probability that submitted photo is recycled or staged

## Requirements

### Requirement 1: Edge-AI Auto-Audit

**User Story:** As a verification participant, I want to upload a toilet photo and receive an immediate AI-scored assessment, so that I can verify facility condition without manual inspection bias.

#### Acceptance Criteria

1. WHEN a verification participant uploads a toilet photo, THE System SHALL analyze it using Groq Llama 4 Scout (Multimodal) across four dimensions: structural integrity, water availability, cleanliness (toilet-focused), and toilet visibility
2. WHEN the AI analysis completes, THE System SHALL return a Hygiene_Score between 0 and 100 with a confidence level assessment
3. WHEN the AI analysis completes, THE System SHALL provide per-dimension visual verification results for each of the four assessment dimensions
4. IF the primary Groq model fails, THEN THE System SHALL fall back to a secondary Groq model or rule-based scoring
5. IF both AI services are unavailable, THEN THE System SHALL fall back to rule-based browser scoring using scorer.js
6. WHEN analyzing a photo, THE System SHALL detect spoofing risk by identifying recycled or staged images
7. WHEN spoofing risk is detected, THE System SHALL flag the submission with a spoofing risk assessment level
8. WHEN the verification participant submits a 4-item binary checklist (door, water, toilet clean, toilet visible), THE System SHALL incorporate checklist data into the final Hygiene_Score calculation
9. WHEN AI scoring returns discrepancies between photo analysis and checklist responses, THE System SHALL flag the discrepancy for review

### Requirement 2: Bayesian Collusion Detection

**User Story:** As a capital consumer, I want mathematically independent verification from three parties with AI adjudication, so that I can trust the hygiene scores are manipulation-resistant.

#### Acceptance Criteria

1. WHEN three verification participants (household, non-adjacent peer, separate-ward auditor) submit reports for the same facility, THE System SHALL ensure mathematical independence by validating geographic and organizational separation
2. WHEN all three reports are received, THE System SHALL send them to Groq for adjudication analysis
3. WHEN Groq performs adjudication, THE System SHALL analyze score variance across the three submissions
4. WHEN Groq performs adjudication, THE System SHALL analyze checklist consistency across the three submissions
5. WHEN Groq performs adjudication, THE System SHALL detect feature implausibility in submitted data
6. WHEN Groq performs adjudication, THE System SHALL assess statistical independence between submissions
7. WHEN adjudication completes, THE System SHALL output a collusion risk level (low, medium, or high)
8. WHEN adjudication completes, THE System SHALL provide a minting recommendation (approve, reject, or manual review)
9. WHEN collusion risk is high, THE System SHALL prevent Impact_Credit minting until manual review
10. WHEN collusion risk is low and scores are consistent, THE System SHALL automatically approve Impact_Credit minting

### Requirement 3: Glass Vault Audit Ledger

**User Story:** As a capital consumer, I want an immutable audit trail of all verification events, so that I can verify data integrity and assess investment risk.

#### Acceptance Criteria

1. WHEN a Hygiene_Score is generated, THE System SHALL record it in the Glass_Vault append-only SQLite database
2. WHEN a collusion adjudication completes, THE System SHALL record the result in the Glass_Vault
3. WHEN an Impact_Credit is minted, THE System SHALL record the minting event in the Glass_Vault
4. THE System SHALL enforce immutability of Glass_Vault records through schema design constraints
5. THE System SHALL calculate a Volatility_Index for each village cluster as the rolling 30-day standard deviation of Hygiene_Scores
6. WHEN the Volatility_Index is calculated, THE System SHALL publish it to the Glass_Vault
7. WHEN a capital consumer requests audit data, THE System SHALL provide read-only access to Glass_Vault records
8. THE System SHALL prevent deletion or modification of any Glass_Vault record after insertion
9. WHEN Glass_Vault records are queried, THE System SHALL return records with cryptographic integrity verification

### Requirement 4: Continuous Impact Credit Market

**User Story:** As a rural household, I want to receive financial compensation for maintaining functional sanitation, so that I have economic incentive to sustain infrastructure.

#### Acceptance Criteria

1. WHEN a verification event is approved with low collusion risk, THE System SHALL mint fractional Impact_Credits proportional to verified person-days of functional sanitation
2. THE System SHALL calculate Impact_Credit quantity using household size and days since last verification
3. WHEN Impact_Credits are minted, THE System SHALL apply a dynamic pricing engine using rolling Hygiene_Score averages
4. WHEN calculating credit price, THE System SHALL incorporate mesh integrity rates from the village cluster
5. WHEN calculating credit price, THE System SHALL incorporate the Volatility_Index for risk adjustment
6. THE System SHALL aggregate Impact_Credit sales revenue into a Community_Maintenance_Fund
7. WHEN a calendar month ends, THE System SHALL disburse the Community_Maintenance_Fund to participating villages
8. WHEN disbursing funds, THE System SHALL allocate amounts proportional to each household's verified person-days
9. WHEN disbursement occurs, THE System SHALL record the transaction in the Glass_Vault
10. THE System SHALL provide a REST API endpoint for capital consumers to purchase Impact_Credits programmatically

### Requirement 5: Health Mirror Feedback Engine

**User Story:** As a rural household, I want to understand how toilet maintenance protects my family's health, so that I am motivated to maintain the facility.

#### Acceptance Criteria

1. WHEN a village has 90 days of hygiene score history, THE System SHALL correlate the timeline with anonymized health event data
2. WHEN calculating health impact, THE System SHALL apply the WHO diarrheal disease reduction coefficient (23% reduction per 10-point Hygiene_Score improvement)
3. WHEN health correlation is calculated, THE System SHALL send the data to Groq for narrative generation
4. WHEN Groq generates the narrative, THE System SHALL ensure it uses warm, plain-language suitable for rural audiences
5. WHEN the narrative is generated, THE System SHALL include estimated cases prevented based on score improvements
6. WHEN the narrative is generated, THE System SHALL include year-on-year health outcome comparisons
7. WHEN the narrative is generated, THE System SHALL include girls' school attendance correlation data where available
8. THE System SHALL format the Health_Mirror output for full-screen display on shared phones or village projectors
9. THE System SHALL use large typography optimized for group viewing and low-literacy audiences
10. WHEN households view the Health_Mirror, THE System SHALL present information without requiring technical assistance

### Requirement 6: Toilet Verification Submission Interface

**User Story:** As a verification participant, I want a simple mobile interface to submit toilet assessments, so that I can complete verifications efficiently in the field.

#### Acceptance Criteria

1. WHEN a verification participant opens the submission interface, THE System SHALL display a photo upload control prominently at the top of the screen
2. WHEN a verification participant opens the submission interface, THE System SHALL display a 4-item binary checklist (door, water, toilet clean, toilet visible) below the photo upload area
3. THE System SHALL render each checklist item as a toggle or checkbox with clear labels and icons
4. WHEN a photo is uploaded, THE System SHALL display real-time processing status with a progress indicator
5. WHEN AI scoring completes, THE System SHALL display the Hygiene_Score as a large numerical value (0-100) with confidence level percentage
6. WHEN AI scoring completes, THE System SHALL display per-dimension verification results as a card grid showing all four dimensions with individual scores
7. WHEN AI scoring detects discrepancies, THE System SHALL display discrepancy flags with explanations in a highlighted alert section
8. WHEN AI scoring detects spoofing risk, THE System SHALL display the spoofing risk assessment in a warning banner
9. THE System SHALL organize the results screen with: score at top, dimension cards in middle, alerts/warnings at bottom
10. THE System SHALL provide the submission interface as an Android application
11. WHEN network connectivity is poor, THE System SHALL queue submissions for upload when connectivity improves
12. WHEN a submission is successfully recorded, THE System SHALL provide confirmation feedback with a success screen showing submission timestamp and reference number

### Requirement 7: Village Trust Dashboard

**User Story:** As an NGO partner or program manager, I want a geographic overview of village sanitation trust ratings, so that I can identify areas requiring intervention.

#### Acceptance Criteria

1. WHEN a program manager opens the Village Trust Dashboard, THE System SHALL display a Leaflet.js map occupying the left two-thirds of the screen with village clusters
2. WHEN displaying village clusters, THE System SHALL color-code them by Trust_Rating using a green (high) to red (low) gradient scale
3. THE System SHALL display a legend in the top-right corner of the map showing the Trust_Rating color scale
4. WHEN a program manager selects a village cluster, THE System SHALL display a detail panel in the right one-third of the screen
5. WHEN the detail panel is displayed, THE System SHALL show a 90-day Hygiene_Score trend chart using Recharts at the top of the panel
6. WHEN the detail panel is displayed, THE System SHALL show the current Volatility_Index as a metric card below the trend chart
7. WHEN a village has official ODF_Status but AI scores are consistently below 60, THE System SHALL display an ODF Discrepancy Alert banner in red at the top of the detail panel
8. WHEN the detail panel is displayed, THE System SHALL show a live collusion adjudication panel with recent adjudication results as a scrollable list at the bottom
9. THE System SHALL organize the detail panel with: alerts at top, trend chart in middle, metrics cards below chart, adjudication list at bottom
10. THE System SHALL update the dashboard in real-time as new verification data arrives
11. WHEN a program manager hovers over a village cluster, THE System SHALL display summary statistics in a tooltip showing village name, current score, and Trust_Rating
12. THE System SHALL provide the dashboard as a web application accessible via browser with responsive layout for tablet and desktop screens

### Requirement 8: Health Mirror Community Display

**User Story:** As a village council member, I want a large-format health impact display, so that I can share sanitation benefits with the community.

#### Acceptance Criteria

1. WHEN the Health Mirror display is opened, THE System SHALL render a full-screen interface optimized for shared viewing with no navigation chrome or headers
2. WHEN rendering the display, THE System SHALL use large typography with minimum 24pt font size for body text and 48pt for headings
3. THE System SHALL organize the display with: village name header at top, main narrative in center, key metrics in large cards at bottom
4. WHEN the display loads, THE System SHALL fetch the Groq-generated health impact narrative for the village
5. WHEN displaying the narrative, THE System SHALL show estimated diarrheal disease cases prevented as a large highlighted number with descriptive text
6. WHEN displaying the narrative, THE System SHALL show year-on-year health outcome comparisons as a simple before/after visual comparison
7. WHEN displaying the narrative, THE System SHALL show girls' school attendance correlation where available as a percentage improvement metric
8. THE System SHALL use a three-column card layout at the bottom showing: cases prevented, year-on-year change, and attendance impact
9. THE System SHALL format the display for both shared mobile phones (portrait) and village projectors (landscape) with responsive layout
10. WHEN the display is viewed, THE System SHALL present information in plain language without technical jargon
11. WHEN the display is viewed, THE System SHALL use warm, encouraging tone with positive color scheme (greens and blues)
12. THE System SHALL refresh the Health Mirror display monthly with updated health correlation data
13. THE System SHALL include visual icons alongside each metric for low-literacy comprehension

### Requirement 9: Investor Signal Panel

**User Story:** As a capital consumer, I want a concise investment signal dashboard, so that I can make data-driven funding decisions quickly.

#### Acceptance Criteria

1. WHEN a capital consumer opens the Investor Signal Panel, THE System SHALL send 90-day hygiene score history to Groq for analysis
2. WHEN Groq analysis completes, THE System SHALL display the current Credit Price in INR
3. WHEN Groq analysis completes, THE System SHALL display the Volatility_Index for the investment region
4. WHEN Groq analysis completes, THE System SHALL display a Risk_Rating on a scale from AAA to D
5. WHEN Groq analysis completes, THE System SHALL display trend direction (improving, stable, or declining)
6. WHEN Groq analysis completes, THE System SHALL display a disbursement readiness flag
7. WHEN Groq analysis completes, THE System SHALL display a 30-day forecast for hygiene score trends
8. WHEN Groq analysis completes, THE System SHALL display a one-sentence investment signal summary
9. THE System SHALL provide the Investor Signal Panel via REST API for programmatic access
10. THE System SHALL provide the Investor Signal Panel as a web dashboard for manual review

### Requirement 10: Multi-Channel Rural Access

**User Story:** As a rural household without a smartphone, I want to interact with the platform via SMS, IVR, or USSD, so that I can participate without requiring expensive devices.

#### Acceptance Criteria

1. WHEN a rural household sends an SMS query, THE System SHALL respond with relevant sanitation status information
2. WHEN a rural household calls the IVR system, THE System SHALL provide voice-based navigation to hygiene score information
3. WHEN a rural household uses USSD, THE System SHALL provide menu-based access to verification status and fund disbursement information
4. THE System SHALL support SMS commands for checking verification status
5. THE System SHALL support SMS commands for checking Community_Maintenance_Fund balance
6. THE System SHALL send SMS notifications when verification is completed
7. THE System SHALL send SMS notifications when Community_Maintenance_Fund disbursement occurs
8. WHEN sending SMS notifications, THE System SHALL use plain language appropriate for low-literacy audiences
9. THE System SHALL support local language options for SMS, IVR, and USSD interfaces
10. WHEN a rural household requests information via any channel, THE System SHALL respond within 30 seconds

### Requirement 11: REST API for Capital Integration

**User Story:** As a capital consumer, I want a REST API to integrate SanSure data into my investment systems, so that I can automate funding decisions.

#### Acceptance Criteria

1. THE System SHALL provide a REST API endpoint for retrieving village cluster Trust_Ratings
2. THE System SHALL provide a REST API endpoint for retrieving Hygiene_Score timelines
3. THE System SHALL provide a REST API endpoint for retrieving Volatility_Index data
4. THE System SHALL provide a REST API endpoint for purchasing Impact_Credits programmatically
5. THE System SHALL provide a REST API endpoint for retrieving Glass_Vault audit records
6. THE System SHALL provide a REST API endpoint for retrieving collusion adjudication results
7. WHEN a capital consumer calls any API endpoint, THE System SHALL require authentication via API key
8. WHEN a capital consumer calls any API endpoint, THE System SHALL return data in JSON format
9. WHEN a capital consumer calls any API endpoint, THE System SHALL respond within 2 seconds for cached data
10. THE System SHALL provide API documentation with example requests and responses
11. WHEN a capital consumer triggers an automated funding decision, THE System SHALL record the transaction in the Glass_Vault

### Requirement 12: Fallback Scoring System

**User Story:** As a system administrator, I want automatic fallback to alternative scoring methods, so that verification continues during AI service outages.

#### Acceptance Criteria

1. WHEN the primary Groq model fails, THE System SHALL automatically switch to a fallback model or rule-based scoring
2. WHEN both primary and secondary models are unavailable, THE System SHALL automatically switch to rule-based scoring in the frontend
3. WHEN using fallback scoring, THE System SHALL record the scoring method used
4. WHEN using fallback scoring, THE System SHALL flag the reduced confidence level in the Hygiene_Score
5. WHEN the primary AI service becomes available again, THE System SHALL automatically resume using it
6. THE System SHALL monitor API quota usage and predict exhaustion 24 hours in advance
7. WHEN API quota exhaustion is predicted, THE System SHALL send alerts to system administrators
8. THE System SHALL maintain scoring consistency across all three methods within ±10 points for equivalent inputs
9. WHEN rule-based scoring is active, THE System SHALL rely more heavily on checklist data for accuracy
10. THE System SHALL log all fallback events for operational monitoring
