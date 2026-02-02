import type { Knex } from "knex";

function randomDateWithinDays(daysBack: number): Date {
  const now = Date.now();
  const deltaMs = Math.floor(Math.random() * daysBack * 24 * 60 * 60 * 1000);
  return new Date(now - deltaMs);
}

export async function seed(knex: Knex): Promise<void> {
  // Clean knowledge_items
  await knex("knowledge_items").del();

  // Get a user to assign as owner
  const users = await knex("users").select("id").limit(5);
  const getOwnerId = () => users[Math.floor(Math.random() * users.length)]?.id || null;

  // ============================================
  // 1. DOCS LIBRARY (~25 items)
  // ============================================
  const docsItems = [
    {
      type: "docs",
      title: "Getting Started with Adamant SaaS",
      category: "getting-started",
      body: `# Getting Started with Adamant SaaS

Welcome to Adamant SaaS! This guide will help you get up and running quickly.

## Prerequisites
- A valid Adamant SaaS account
- API credentials (available in Settings > API Keys)

## Quick Start
1. Sign up at https://adamant.example/signup
2. Verify your email address
3. Create your first project from the Dashboard
4. Generate an API key in Settings

## Next Steps
- Read the API Quickstart guide
- Set up SSO for your organization
- Invite team members

For support, contact support@adamant.example`,
      tags: ["onboarding", "quickstart", "beginner"],
      metadata_json: { reading_time_minutes: 5, difficulty: "beginner" }
    },
    {
      type: "docs",
      title: "SSO Configuration Guide",
      category: "guides",
      body: `# SSO Configuration Guide

Adamant SaaS supports SAML 2.0 and OIDC for Single Sign-On.

## Supported Providers
- Okta
- Azure AD
- Google Workspace
- OneLogin

## SAML Setup
1. Navigate to Settings > Authentication > SSO
2. Select "SAML 2.0"
3. Download our SP metadata or copy:
   - Entity ID: https://adamant.example/saml/metadata
   - ACS URL: https://adamant.example/saml/acs
4. Configure your IdP with these values
5. Upload IdP metadata XML
6. Test the connection

## Attribute Mapping
| IdP Attribute | Adamant Field |
|---------------|---------------|
| email         | user.email    |
| firstName     | user.firstName|
| lastName      | user.lastName |
| groups        | user.roles    |

## Troubleshooting
- Ensure clock sync between IdP and Adamant
- Check SAML signature algorithm matches (SHA-256)
- Verify ACS URL has no trailing slash`,
      tags: ["sso", "saml", "security", "enterprise"],
      metadata_json: { reading_time_minutes: 15, difficulty: "intermediate" }
    },
    {
      type: "docs",
      title: "API Quickstart",
      category: "getting-started",
      body: `# API Quickstart

Get started with the Adamant SaaS API in minutes.

## Authentication
All API requests require an API key in the Authorization header:
\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

## Base URL
\`\`\`
https://api.adamant.example/v1
\`\`\`

## Your First Request
\`\`\`bash
curl -X GET https://api.adamant.example/v1/projects \\
  -H "Authorization: Bearer YOUR_API_KEY"
\`\`\`

## Rate Limits
- Standard: 1000 requests/minute
- Enterprise: 10000 requests/minute

## SDKs Available
- JavaScript/TypeScript: @adamant/sdk
- Python: adamant-python
- Go: github.com/adamant/go-sdk`,
      tags: ["api", "quickstart", "developers"],
      metadata_json: { reading_time_minutes: 8, difficulty: "beginner" }
    },
    {
      type: "docs",
      title: "Billing and Subscriptions FAQ",
      category: "faq",
      body: `# Billing FAQ

## How do I upgrade my plan?
Navigate to Settings > Billing > Change Plan. Select your new plan and confirm.

## When am I charged?
Charges occur on the 1st of each month for the upcoming period.

## Can I get a refund?
We offer a 14-day money-back guarantee for new subscriptions. Contact support.

## How do I add more seats?
Settings > Billing > Manage Seats. Additional seats are prorated.

## What payment methods are accepted?
- Credit/debit cards (Visa, Mastercard, Amex)
- ACH bank transfer (US only)
- Wire transfer (Enterprise plans)

## How do I cancel?
Settings > Billing > Cancel Subscription. Your access continues until the end of the billing period.

## Do you offer discounts?
- Annual billing: 20% discount
- Nonprofits: 50% discount (contact sales)
- Startups: Special pricing available`,
      tags: ["billing", "faq", "pricing"],
      metadata_json: { reading_time_minutes: 5, difficulty: "beginner" }
    },
    {
      type: "docs",
      title: "Webhooks Integration",
      category: "guides",
      body: `# Webhooks Integration

Receive real-time notifications when events occur in Adamant SaaS.

## Supported Events
- project.created
- project.updated
- project.deleted
- user.invited
- user.removed
- api_key.created
- api_key.revoked

## Setup
1. Go to Settings > Webhooks
2. Click "Add Endpoint"
3. Enter your HTTPS URL
4. Select events to subscribe
5. Save and copy the signing secret

## Payload Format
\`\`\`json
{
  "event": "project.created",
  "timestamp": "2026-01-15T10:30:00Z",
  "data": {
    "id": "proj_abc123",
    "name": "My Project"
  }
}
\`\`\`

## Verifying Signatures
All webhooks include an X-Adamant-Signature header. Verify using HMAC-SHA256 with your signing secret.`,
      tags: ["webhooks", "integration", "developers"],
      metadata_json: { reading_time_minutes: 10, difficulty: "intermediate" }
    },
    {
      type: "docs",
      title: "User Roles and Permissions",
      category: "guides",
      body: `# User Roles and Permissions

Adamant SaaS has a role-based access control system.

## Built-in Roles

### Admin
- Full access to all features
- Can manage users and roles
- Can manage billing
- Can delete organization

### Member
- Can view and edit projects
- Can create API keys for self
- Cannot manage other users
- Cannot access billing

### Viewer (Read-only)
- Can view projects and data
- Cannot make changes
- Cannot create API keys

## Custom Roles (Enterprise)
Create custom roles with granular permissions:
- project:read, project:write, project:delete
- user:read, user:invite, user:remove
- settings:read, settings:write
- billing:read, billing:write`,
      tags: ["roles", "permissions", "security"],
      metadata_json: { reading_time_minutes: 7, difficulty: "intermediate" }
    },
    {
      type: "docs",
      title: "Data Export Guide",
      category: "how-to",
      body: `# Data Export Guide

Export your data from Adamant SaaS in various formats.

## Available Export Formats
- JSON
- CSV
- JSONL (for large datasets)

## Exporting via UI
1. Navigate to the data you want to export
2. Click the "Export" button
3. Select format and filters
4. Download begins automatically

## Exporting via API
\`\`\`bash
GET /v1/exports/{resource}?format=jsonl
\`\`\`

## Bulk Export (Enterprise)
Request a full data export:
1. Go to Settings > Data Management
2. Click "Request Full Export"
3. You'll receive an email with download link within 24 hours

## Data Retention
Exported files are available for 7 days.`,
      tags: ["export", "data", "how-to"],
      metadata_json: { reading_time_minutes: 5, difficulty: "beginner" }
    },
    {
      type: "docs",
      title: "Glossary of Terms",
      category: "glossary",
      body: `# Glossary

## A
**API Key** - A unique identifier used to authenticate API requests.

**Audit Log** - A record of all actions taken in your organization.

## O
**Organization** - The top-level account that contains all users and projects.

## P
**Project** - A container for resources and configurations within Adamant SaaS.

## R
**Role** - A set of permissions assigned to users.

**Rate Limit** - The maximum number of API requests allowed per time period.

## S
**SSO** - Single Sign-On, allowing users to authenticate via external identity providers.

**Seat** - A user license within your subscription.

## W
**Webhook** - An HTTP callback that sends real-time notifications when events occur.

**Workspace** - A subdivision within a project for organizing resources.`,
      tags: ["glossary", "reference", "terminology"],
      metadata_json: { reading_time_minutes: 3, difficulty: "beginner" }
    },
    {
      type: "docs",
      title: "Two-Factor Authentication Setup",
      category: "how-to",
      body: `# Two-Factor Authentication (2FA)

Add an extra layer of security to your account.

## Setup Instructions
1. Go to your Profile > Security
2. Click "Enable 2FA"
3. Scan QR code with authenticator app
4. Enter the 6-digit code to verify
5. Save backup codes securely

## Supported Apps
- Google Authenticator
- Authy
- 1Password
- Microsoft Authenticator

## Backup Codes
You receive 10 backup codes. Each code can only be used once. Store them securely (password manager recommended).

## Lost Access?
If you lose your 2FA device:
1. Use a backup code to sign in
2. Disable and re-enable 2FA
3. Contact support if no backup codes available (identity verification required)`,
      tags: ["2fa", "security", "how-to"],
      metadata_json: { reading_time_minutes: 5, difficulty: "beginner" }
    },
    {
      type: "docs",
      title: "Project Templates",
      category: "guides",
      body: `# Project Templates

Start new projects quickly with pre-configured templates.

## Available Templates

### Basic Project
- Standard configuration
- Default settings
- Single environment

### Enterprise Project
- Multi-environment (dev, staging, prod)
- Advanced access controls
- Audit logging enabled

### API-First Project
- API key pre-generated
- Webhook endpoints configured
- Rate limiting customized

## Using Templates
1. Click "New Project"
2. Select "Start from template"
3. Choose template
4. Customize settings
5. Create project

## Creating Custom Templates (Enterprise)
Save any project as a template for your organization:
Project Settings > Save as Template`,
      tags: ["templates", "projects", "productivity"],
      metadata_json: { reading_time_minutes: 5, difficulty: "beginner" }
    },
    {
      type: "docs",
      title: "Environment Variables",
      category: "guides",
      body: `# Environment Variables

Manage configuration across environments securely.

## Setting Variables
1. Navigate to Project > Settings > Environment
2. Click "Add Variable"
3. Enter key and value
4. Select scope (Development, Staging, Production)

## Secret Variables
Mark sensitive values as "Secret":
- Values are encrypted at rest
- Never logged or displayed after creation
- Cannot be retrieved, only overwritten

## Using in Code
Access via SDK:
\`\`\`javascript
const apiKey = adamant.env.get('API_KEY');
\`\`\`

## Best Practices
- Never commit secrets to version control
- Use different values per environment
- Rotate secrets regularly
- Limit access to production variables`,
      tags: ["environment", "configuration", "security"],
      metadata_json: { reading_time_minutes: 6, difficulty: "intermediate" }
    },
    {
      type: "docs",
      title: "Audit Logging",
      category: "guides",
      body: `# Audit Logging

Track all actions in your organization for compliance and security.

## What's Logged
- User sign-ins and sign-outs
- Permission changes
- Project modifications
- API key operations
- Settings changes
- Data exports

## Viewing Audit Logs
Dashboard > Activity > Audit Log

## Filtering
- By user
- By action type
- By date range
- By resource

## Log Retention
- Standard: 90 days
- Enterprise: 2 years
- Custom retention available (Enterprise)

## Exporting Logs
Export to SIEM systems:
- Splunk
- Datadog
- Sumo Logic
- Custom webhook`,
      tags: ["audit", "logging", "compliance", "security"],
      metadata_json: { reading_time_minutes: 7, difficulty: "intermediate" }
    },
    {
      type: "docs",
      title: "Team Collaboration",
      category: "guides",
      body: `# Team Collaboration

Work effectively with your team in Adamant SaaS.

## Inviting Team Members
1. Settings > Team > Invite
2. Enter email addresses
3. Select role
4. Send invitations

## Collaboration Features
- **Comments** - Add comments to any resource
- **Mentions** - @username to notify team members
- **Activity Feed** - See recent team activity
- **Shared Views** - Save and share filtered views

## Teams (Enterprise)
Create sub-teams within your organization:
- Engineering
- Marketing
- Support

Assign projects to teams for better organization.

## Notifications
Configure notifications in Profile > Notifications:
- Email digest (daily/weekly)
- Real-time email alerts
- In-app notifications`,
      tags: ["team", "collaboration", "productivity"],
      metadata_json: { reading_time_minutes: 6, difficulty: "beginner" }
    },
    {
      type: "docs",
      title: "API Versioning",
      category: "guides",
      body: `# API Versioning

Understanding Adamant SaaS API versions.

## Version Format
We use date-based versioning: YYYY-MM-DD

## Specifying Version
Include in header:
\`\`\`
Adamant-Version: 2026-01-15
\`\`\`

Or use versioned endpoint:
\`\`\`
https://api.adamant.example/v1/...
\`\`\`

## Version Lifecycle
- **Current**: Latest stable version
- **Supported**: Previous 12 months
- **Deprecated**: 6 months notice before removal
- **Retired**: No longer available

## Breaking Changes
Breaking changes only in new versions:
- Removing endpoints
- Changing response structure
- Modifying authentication

Non-breaking changes added anytime:
- New endpoints
- New optional fields
- New filter options`,
      tags: ["api", "versioning", "developers"],
      metadata_json: { reading_time_minutes: 5, difficulty: "intermediate" }
    },
    {
      type: "docs",
      title: "Error Handling Best Practices",
      category: "guides",
      body: `# Error Handling Best Practices

Handle API errors gracefully in your applications.

## Error Response Format
\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "constraint": "email_format"
    }
  }
}
\`\`\`

## Common Error Codes
| Code | HTTP Status | Meaning |
|------|-------------|---------|
| UNAUTHORIZED | 401 | Invalid or missing API key |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource doesn't exist |
| RATE_LIMITED | 429 | Too many requests |
| VALIDATION_ERROR | 400 | Invalid input |
| INTERNAL_ERROR | 500 | Server error |

## Retry Strategy
Implement exponential backoff:
1. First retry: 1 second
2. Second retry: 2 seconds
3. Third retry: 4 seconds
Max 5 retries.

Only retry 429 and 5xx errors.`,
      tags: ["api", "errors", "developers", "best-practices"],
      metadata_json: { reading_time_minutes: 7, difficulty: "intermediate" }
    },
    {
      type: "docs",
      title: "Mobile App Setup",
      category: "getting-started",
      body: `# Mobile App Setup

Access Adamant SaaS on the go.

## Download
- iOS: App Store "Adamant SaaS"
- Android: Google Play "Adamant SaaS"

## Sign In
1. Open the app
2. Enter your email
3. Complete authentication (password or SSO)
4. Enable biometric unlock (optional)

## Features
- View dashboards
- Receive push notifications
- Quick actions
- View activity feed

## Push Notifications
Enable for:
- Critical alerts
- Team mentions
- Project updates

## Offline Mode
View cached data when offline. Changes sync when connected.

## Security
- Auto-lock after 5 minutes
- Biometric authentication
- Remote wipe available`,
      tags: ["mobile", "app", "getting-started"],
      metadata_json: { reading_time_minutes: 4, difficulty: "beginner" }
    },
    {
      type: "docs",
      title: "Keyboard Shortcuts",
      category: "how-to",
      body: `# Keyboard Shortcuts

Navigate Adamant SaaS faster with keyboard shortcuts.

## Global
| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + K | Quick search |
| Cmd/Ctrl + / | Toggle sidebar |
| G then H | Go to home |
| G then P | Go to projects |
| G then S | Go to settings |

## Navigation
| Shortcut | Action |
|----------|--------|
| J | Next item |
| K | Previous item |
| Enter | Open selected |
| Esc | Close modal/go back |

## Actions
| Shortcut | Action |
|----------|--------|
| N | New item |
| E | Edit selected |
| D | Delete selected |
| Cmd/Ctrl + S | Save |

## Help
Press ? to see all shortcuts`,
      tags: ["keyboard", "shortcuts", "productivity"],
      metadata_json: { reading_time_minutes: 3, difficulty: "beginner" }
    },
    {
      type: "docs",
      title: "Data Residency Options",
      category: "guides",
      body: `# Data Residency

Choose where your data is stored for compliance requirements.

## Available Regions
- US (us-east-1, us-west-2)
- EU (eu-west-1, eu-central-1)
- Asia Pacific (ap-southeast-1)

## Selecting Region
Choose during organization creation. Cannot be changed after.

## Data Stored in Region
- User data
- Project data
- Files and attachments
- Audit logs

## Cross-Region Features
Some features require cross-region communication:
- Global search (metadata only)
- Email notifications
- Analytics (anonymized)

## Compliance
- SOC 2 Type II
- GDPR compliant
- HIPAA (Enterprise)
- ISO 27001`,
      tags: ["data-residency", "compliance", "enterprise"],
      metadata_json: { reading_time_minutes: 5, difficulty: "intermediate" }
    },
    {
      type: "docs",
      title: "Integrations Overview",
      category: "guides",
      body: `# Integrations Overview

Connect Adamant SaaS with your existing tools.

## Native Integrations
- **Slack** - Notifications and commands
- **Microsoft Teams** - Notifications
- **Jira** - Two-way sync
- **GitHub** - Link repositories
- **GitLab** - Link repositories
- **Salesforce** - Sync contacts

## Setting Up Integrations
1. Go to Settings > Integrations
2. Select integration
3. Click "Connect"
4. Authorize access
5. Configure options

## Zapier
Connect to 5000+ apps via Zapier:
- Triggers: New project, new user, etc.
- Actions: Create project, invite user, etc.

## Custom Integrations
Build custom integrations using:
- REST API
- Webhooks
- OAuth 2.0 apps`,
      tags: ["integrations", "slack", "zapier", "productivity"],
      metadata_json: { reading_time_minutes: 6, difficulty: "intermediate" }
    },
    {
      type: "docs",
      title: "Bulk Operations",
      category: "how-to",
      body: `# Bulk Operations

Perform actions on multiple items at once.

## Selecting Multiple Items
- Click checkbox to select individual items
- Click header checkbox to select all visible
- Shift+Click to select range

## Available Bulk Actions
- Delete
- Archive
- Change status
- Assign to team
- Add tags
- Export

## Bulk Import
Import data via CSV:
1. Go to Data > Import
2. Download template
3. Fill in data
4. Upload CSV
5. Map columns
6. Review and import

## API Bulk Operations
\`\`\`bash
POST /v1/projects/bulk
{
  "operations": [
    { "method": "create", "data": {...} },
    { "method": "update", "id": "...", "data": {...} }
  ]
}
\`\`\`

Max 100 operations per request.`,
      tags: ["bulk", "import", "export", "productivity"],
      metadata_json: { reading_time_minutes: 6, difficulty: "intermediate" }
    }
  ];

  // ============================================
  // 2. POLICIES & COMPLIANCE (~15 items)
  // ============================================
  const policyItems = [
    {
      type: "policies",
      title: "Privacy Policy",
      category: "privacy",
      body: `# Privacy Policy

Last updated: January 15, 2026

## Information We Collect
We collect information you provide directly:
- Account information (name, email, company)
- Usage data and analytics
- Support communications

## How We Use Your Information
- Provide and improve our services
- Send important notifications
- Prevent fraud and abuse
- Comply with legal obligations

## Data Sharing
We do not sell your personal data. We share data only with:
- Service providers (hosting, email, analytics)
- Legal authorities when required
- Your organization admins (for business accounts)

## Your Rights
- Access your data
- Request deletion
- Export your data
- Opt out of marketing

## Contact
privacy@adamant.example`,
      tags: ["privacy", "gdpr", "legal"],
      metadata_json: { effective_date: "2026-01-15", version: "3.2" }
    },
    {
      type: "policies",
      title: "Data Retention Policy",
      category: "data-retention",
      body: `# Data Retention Policy

## Active Account Data
- User data: Retained while account is active
- Project data: Retained while project exists
- Audit logs: 2 years (Enterprise), 90 days (Standard)

## Deleted Data
When you delete data:
- Soft delete: 30 days (recoverable)
- Hard delete: After 30 days (permanent)
- Backups purged: Within 90 days

## Account Closure
After account closure:
- Data retained for 30 days (recovery period)
- Complete deletion within 90 days
- Legal holds may extend retention

## Exceptions
Certain data retained longer for:
- Legal compliance
- Fraud prevention
- Aggregate analytics (anonymized)

## Data Deletion Requests
Submit via Settings > Data Management > Request Deletion`,
      tags: ["data-retention", "gdpr", "compliance"],
      metadata_json: { effective_date: "2026-01-01", version: "2.1" }
    },
    {
      type: "policies",
      title: "Security Guidelines",
      category: "security",
      body: `# Security Guidelines

## Password Requirements
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Cannot reuse last 5 passwords
- Expires every 90 days (configurable)

## Session Security
- Sessions expire after 24 hours of inactivity
- Maximum 5 concurrent sessions
- Automatic logout on password change

## API Key Security
- Keys are shown only once at creation
- Keys can be scoped to specific permissions
- Keys should be rotated every 90 days
- Never commit keys to version control

## Network Security
- All traffic encrypted via TLS 1.3
- IP allowlisting available (Enterprise)
- WAF protection enabled
- DDoS mitigation

## Incident Response
Report security issues to security@adamant.example
Bug bounty program available.`,
      tags: ["security", "passwords", "compliance"],
      metadata_json: { effective_date: "2026-01-10", version: "4.0" }
    },
    {
      type: "policies",
      title: "Support SLA",
      category: "sla",
      body: `# Support Service Level Agreement

## Response Times

### Critical (P1)
- Service completely unavailable
- Response: 15 minutes
- Resolution target: 4 hours

### High (P2)
- Major feature impacted
- Response: 1 hour
- Resolution target: 8 hours

### Medium (P3)
- Minor feature impacted
- Response: 4 hours
- Resolution target: 24 hours

### Low (P4)
- Questions, feature requests
- Response: 24 hours
- Resolution target: Best effort

## Support Hours
- Standard: Mon-Fri 9am-6pm (customer timezone)
- Enterprise: 24/7

## SLA Credits
If we miss SLA targets:
- 1 miss: 10% credit
- 2 misses: 25% credit
- 3+ misses: Contact for resolution`,
      tags: ["sla", "support", "enterprise"],
      metadata_json: { effective_date: "2026-01-01", version: "2.0", plan_type: "enterprise" }
    },
    {
      type: "policies",
      title: "Acceptable Use Policy",
      category: "compliance",
      body: `# Acceptable Use Policy

## Prohibited Activities
You may not use Adamant SaaS to:
- Violate any laws or regulations
- Infringe intellectual property rights
- Transmit malware or malicious code
- Attempt unauthorized access
- Conduct spam or phishing
- Store prohibited content
- Exceed rate limits intentionally
- Resell without authorization

## Resource Limits
- API rate limits as per plan
- Storage limits as per plan
- Reasonable use of compute resources

## Enforcement
Violations may result in:
- Warning
- Temporary suspension
- Account termination
- Legal action

## Reporting
Report violations to abuse@adamant.example`,
      tags: ["aup", "compliance", "legal"],
      metadata_json: { effective_date: "2025-06-01", version: "1.5" }
    },
    {
      type: "policies",
      title: "GDPR Data Processing Agreement",
      category: "privacy",
      body: `# Data Processing Agreement (GDPR)

## Scope
This DPA applies when Adamant SaaS processes personal data on behalf of customers in the EU/EEA.

## Roles
- Customer: Data Controller
- Adamant SaaS: Data Processor

## Processing Details
- Subject matter: Provision of Adamant SaaS services
- Duration: Term of service agreement
- Nature: Storage, processing, transmission
- Personal data types: As defined by customer
- Data subjects: Customer's users and end-users

## Our Obligations
- Process data only on documented instructions
- Ensure personnel confidentiality
- Implement appropriate security measures
- Assist with data subject requests
- Delete data upon termination
- Allow and contribute to audits

## Sub-processors
See adamant.example/subprocessors for current list.
30-day notice before new sub-processors.

## Data Transfers
Standard Contractual Clauses for transfers outside EEA.`,
      tags: ["gdpr", "dpa", "privacy", "eu"],
      metadata_json: { effective_date: "2025-01-01", version: "3.0" }
    },
    {
      type: "policies",
      title: "Uptime SLA",
      category: "sla",
      body: `# Uptime Service Level Agreement

## Commitment
- Standard plans: 99.9% monthly uptime
- Enterprise plans: 99.99% monthly uptime

## Calculation
Uptime % = (Total minutes - Downtime minutes) / Total minutes × 100

## Exclusions
Downtime excludes:
- Scheduled maintenance (announced 48h in advance)
- Customer-caused issues
- Force majeure
- Third-party service outages

## Credits

### Standard (99.9%)
| Uptime | Credit |
|--------|--------|
| < 99.9% | 10% |
| < 99.5% | 25% |
| < 99.0% | 50% |

### Enterprise (99.99%)
| Uptime | Credit |
|--------|--------|
| < 99.99% | 10% |
| < 99.9% | 25% |
| < 99.5% | 50% |

## Claiming Credits
Submit within 30 days via support ticket.`,
      tags: ["sla", "uptime", "enterprise"],
      metadata_json: { effective_date: "2026-01-01", version: "2.1" }
    },
    {
      type: "policies",
      title: "Password Policy Exceptions",
      category: "security",
      body: `# Password Policy Exceptions

## Overview
In certain cases, organizations may request exceptions to the default password policy.

## Exception Types

### Extended Expiration
- Default: 90 days
- Exception: Up to 180 days
- Requires: Compensating controls (MFA required)

### Reduced Complexity
- Not recommended
- Requires: Written risk acceptance
- Minimum: 10 characters, mixed case

### Service Accounts
- No expiration allowed
- Requires: IP restriction + dedicated monitoring

## Request Process
1. Submit exception request form
2. Security team review (5 business days)
3. Risk assessment documentation
4. Executive approval required
5. Annual review required

## Audit
All exceptions logged and reviewed quarterly.`,
      tags: ["security", "passwords", "exceptions"],
      metadata_json: { effective_date: "2025-06-01", version: "1.2", exception_type: "policy" }
    },
    {
      type: "policies",
      title: "Data Classification Policy",
      category: "compliance",
      body: `# Data Classification Policy

## Classification Levels

### Public
- Marketing materials
- Public documentation
- No access restrictions

### Internal
- Internal communications
- Non-sensitive business data
- Employee access only

### Confidential
- Customer data
- Financial information
- Need-to-know access

### Restricted
- PII/PHI
- Security credentials
- Encryption required
- Audit logging required

## Handling Requirements
| Level | Storage | Transit | Disposal |
|-------|---------|---------|----------|
| Public | Any | Any | Standard |
| Internal | Approved systems | TLS | Secure delete |
| Confidential | Encrypted | TLS | Crypto-shred |
| Restricted | Encrypted + audit | TLS 1.3 | Crypto-shred + verify |

## Labeling
All documents should be labeled with classification.`,
      tags: ["data-classification", "security", "compliance"],
      metadata_json: { effective_date: "2025-09-01", version: "2.0" }
    },
    {
      type: "policies",
      title: "Third-Party Vendor Policy",
      category: "compliance",
      body: `# Third-Party Vendor Policy

## Vendor Assessment
All vendors with access to customer data must:
- Complete security questionnaire
- Provide SOC 2 report (or equivalent)
- Sign data processing agreement
- Undergo annual review

## Approved Vendor Categories
- Cloud infrastructure (AWS, GCP)
- Email services (SendGrid)
- Analytics (anonymized data only)
- Support tools (Zendesk)
- Payment processing (Stripe)

## Prohibited
- Vendors in sanctioned countries
- Vendors without encryption
- Vendors without incident response

## Monitoring
- Quarterly access reviews
- Annual security assessments
- Continuous compliance monitoring

## Current Vendors
See adamant.example/subprocessors`,
      tags: ["vendors", "third-party", "compliance"],
      metadata_json: { effective_date: "2025-03-01", version: "1.8" }
    },
    {
      type: "policies",
      title: "Incident Response Policy",
      category: "security",
      body: `# Incident Response Policy

## Severity Levels
- **SEV1**: Data breach, complete outage
- **SEV2**: Partial outage, security vulnerability
- **SEV3**: Degraded performance
- **SEV4**: Minor issues

## Response Timeline
| Severity | Detection | Response | Communication |
|----------|-----------|----------|---------------|
| SEV1 | Immediate | 15 min | 1 hour |
| SEV2 | 15 min | 1 hour | 4 hours |
| SEV3 | 1 hour | 4 hours | 24 hours |
| SEV4 | 4 hours | 24 hours | As needed |

## Communication
- Status page: status.adamant.example
- Email: Affected customers
- In-app: Banner notification

## Post-Incident
- Root cause analysis within 5 days
- Public postmortem for SEV1/SEV2
- Follow-up items tracked to completion`,
      tags: ["incident-response", "security", "operations"],
      metadata_json: { effective_date: "2025-01-01", version: "3.5" }
    },
    {
      type: "policies",
      title: "Employee Access Policy",
      category: "security",
      body: `# Employee Access Policy

## Principles
- Least privilege access
- Need-to-know basis
- Regular access reviews

## Access Levels
1. **Support** - Read access to customer metadata
2. **Engineering** - Production read for debugging
3. **Security** - Full audit access
4. **Executive** - Aggregate reporting only

## Customer Data Access
- Requires customer consent OR
- Active support ticket OR
- Legal/compliance requirement
- All access logged and auditable

## Access Reviews
- Quarterly review of all access
- Immediate revocation on role change
- Annual recertification

## Monitoring
- All production access logged
- Anomaly detection alerts
- Monthly audit reports`,
      tags: ["employee-access", "security", "compliance"],
      metadata_json: { effective_date: "2025-01-01", version: "2.3" }
    },
    {
      type: "policies",
      title: "Cookie Policy",
      category: "privacy",
      body: `# Cookie Policy

## What Are Cookies
Cookies are small text files stored on your device.

## Cookies We Use

### Essential (Required)
- Session management
- Security tokens
- Cannot be disabled

### Functional
- Language preferences
- UI settings
- Remember login

### Analytics
- Usage patterns
- Performance metrics
- Can be disabled

### Marketing
- Ad targeting (not used)
- Cross-site tracking (not used)

## Managing Cookies
- Browser settings
- Our cookie preferences center
- Do Not Track respected

## Third-Party Cookies
Limited to essential services:
- Authentication providers
- CDN providers`,
      tags: ["cookies", "privacy", "gdpr"],
      metadata_json: { effective_date: "2025-01-01", version: "1.5" }
    }
  ];

  // ============================================
  // 3. API REFERENCE (~30 items)
  // ============================================
  const apiItems = [
    {
      type: "api_reference",
      title: "Authentication",
      category: "authentication",
      body: `Authenticate API requests using API keys or OAuth 2.0 tokens.

All requests must include authentication in the Authorization header.

API keys are suitable for server-to-server communication.
OAuth tokens are recommended for user-facing applications.`,
      tags: ["auth", "api-key", "oauth"],
      metadata_json: {
        method: "POST",
        path: "/auth/token",
        example_request: { grant_type: "client_credentials", client_id: "...", client_secret: "..." },
        example_response: { access_token: "eyJ...", token_type: "Bearer", expires_in: 3600 }
      }
    },
    {
      type: "api_reference",
      title: "List Projects",
      category: "projects",
      body: `Retrieve a paginated list of projects.

Results can be filtered by status and sorted by various fields.
Pagination uses cursor-based pagination for consistency.`,
      tags: ["projects", "list", "pagination"],
      metadata_json: {
        method: "GET",
        path: "/v1/projects",
        example_request: { page: 1, pageSize: 20, status: "active" },
        example_response: { data: { items: [], total: 0, page: 1, pageSize: 20 } }
      }
    },
    {
      type: "api_reference",
      title: "Create Project",
      category: "projects",
      body: `Create a new project in your organization.

Projects are containers for resources and configurations.
Name must be unique within the organization.`,
      tags: ["projects", "create"],
      metadata_json: {
        method: "POST",
        path: "/v1/projects",
        example_request: { name: "My Project", description: "Project description" },
        example_response: { data: { project: { id: "proj_abc", name: "My Project" } } }
      }
    },
    {
      type: "api_reference",
      title: "Get Project",
      category: "projects",
      body: `Retrieve details of a specific project by ID.

Returns full project details including metadata and settings.`,
      tags: ["projects", "get", "detail"],
      metadata_json: {
        method: "GET",
        path: "/v1/projects/:id",
        example_response: { data: { project: { id: "proj_abc", name: "My Project", status: "active" } } }
      }
    },
    {
      type: "api_reference",
      title: "Update Project",
      category: "projects",
      body: `Update an existing project.

Only provided fields will be updated. Omitted fields remain unchanged.`,
      tags: ["projects", "update", "patch"],
      metadata_json: {
        method: "PATCH",
        path: "/v1/projects/:id",
        example_request: { name: "Updated Name", status: "paused" },
        example_response: { data: { project: { id: "proj_abc", name: "Updated Name" } } }
      }
    },
    {
      type: "api_reference",
      title: "Delete Project",
      category: "projects",
      body: `Delete a project and all associated resources.

This action is irreversible. Projects are soft-deleted for 30 days.`,
      tags: ["projects", "delete"],
      metadata_json: {
        method: "DELETE",
        path: "/v1/projects/:id",
        example_response: { data: { success: true } }
      }
    },
    {
      type: "api_reference",
      title: "List Users",
      category: "users",
      body: `List all users in your organization.

Includes role information and last active timestamp.`,
      tags: ["users", "list"],
      metadata_json: {
        method: "GET",
        path: "/v1/users",
        example_response: { data: { items: [{ id: "user_1", email: "...", role: "member" }], total: 1 } }
      }
    },
    {
      type: "api_reference",
      title: "Invite User",
      category: "users",
      body: `Invite a new user to your organization.

An invitation email will be sent to the provided email address.`,
      tags: ["users", "invite", "create"],
      metadata_json: {
        method: "POST",
        path: "/v1/users/invite",
        example_request: { email: "newuser@example.com", role: "member" },
        example_response: { data: { invitation: { id: "inv_1", email: "...", status: "pending" } } }
      }
    },
    {
      type: "api_reference",
      title: "Create Webhook",
      category: "webhooks",
      body: `Register a webhook endpoint to receive event notifications.

Your endpoint must respond with 2xx within 30 seconds.`,
      tags: ["webhooks", "create"],
      metadata_json: {
        method: "POST",
        path: "/v1/webhooks",
        example_request: { url: "https://example.com/webhook", events: ["project.created"] },
        example_response: { data: { webhook: { id: "wh_1", secret: "whsec_..." } } }
      }
    },
    {
      type: "api_reference",
      title: "List Webhooks",
      category: "webhooks",
      body: `List all registered webhook endpoints.

Includes delivery statistics for each endpoint.`,
      tags: ["webhooks", "list"],
      metadata_json: {
        method: "GET",
        path: "/v1/webhooks",
        example_response: { data: { items: [{ id: "wh_1", url: "...", events: [] }] } }
      }
    },
    {
      type: "api_reference",
      title: "Rate Limits",
      category: "rate-limits",
      body: `API rate limits vary by plan and endpoint.

When rate limited, you'll receive a 429 response with Retry-After header.

Implement exponential backoff for best results.`,
      tags: ["rate-limits", "throttling"],
      metadata_json: {
        limits: { standard: "1000/min", enterprise: "10000/min" },
        headers: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"]
      }
    },
    {
      type: "api_reference",
      title: "Error Codes",
      category: "errors",
      body: `Standard error codes returned by the API.

All errors follow a consistent format with code and message.`,
      tags: ["errors", "troubleshooting"],
      metadata_json: {
        codes: {
          UNAUTHORIZED: { status: 401, description: "Invalid or missing authentication" },
          FORBIDDEN: { status: 403, description: "Insufficient permissions" },
          NOT_FOUND: { status: 404, description: "Resource not found" },
          RATE_LIMITED: { status: 429, description: "Too many requests" },
          VALIDATION_ERROR: { status: 400, description: "Invalid input" }
        }
      }
    },
    {
      type: "api_reference",
      title: "Create API Key",
      category: "authentication",
      body: `Generate a new API key for programmatic access.

The key is only shown once at creation time. Store it securely.`,
      tags: ["api-key", "create", "auth"],
      metadata_json: {
        method: "POST",
        path: "/v1/api-keys",
        example_request: { name: "Production Key", scopes: ["read", "write"] },
        example_response: { data: { api_key: { id: "key_1", key: "ak_live_...", last4: "abcd" } } }
      }
    },
    {
      type: "api_reference",
      title: "Revoke API Key",
      category: "authentication",
      body: `Revoke an API key immediately.

All requests using this key will fail after revocation.`,
      tags: ["api-key", "revoke", "auth"],
      metadata_json: {
        method: "DELETE",
        path: "/v1/api-keys/:id",
        example_response: { data: { success: true } }
      }
    },
    {
      type: "api_reference",
      title: "Bulk Operations",
      category: "projects",
      body: `Perform multiple operations in a single request.

Maximum 100 operations per request. Operations are processed in order.`,
      tags: ["bulk", "batch"],
      metadata_json: {
        method: "POST",
        path: "/v1/projects/bulk",
        example_request: {
          operations: [
            { method: "create", data: { name: "Project 1" } },
            { method: "update", id: "proj_1", data: { status: "active" } }
          ]
        }
      }
    },
    {
      type: "api_reference",
      title: "Export Data",
      category: "exports",
      body: `Export resource data in JSONL format.

Large exports are processed asynchronously with a download link.`,
      tags: ["export", "jsonl"],
      metadata_json: {
        method: "GET",
        path: "/v1/exports/:resource",
        example_request: { format: "jsonl", filters: { status: "active" } },
        example_response: "JSONL stream - one JSON object per line"
      }
    },
    {
      type: "api_reference",
      title: "Search",
      category: "search",
      body: `Full-text search across resources.

Supports filters, sorting, and highlighting.`,
      tags: ["search", "query"],
      metadata_json: {
        method: "GET",
        path: "/v1/search",
        example_request: { q: "project name", type: "project", limit: 10 },
        example_response: { data: { results: [], total: 0 } }
      }
    },
    {
      type: "api_reference",
      title: "Get Current User",
      category: "users",
      body: `Retrieve the authenticated user's profile.

Useful for validating authentication and getting user context.`,
      tags: ["users", "profile", "me"],
      metadata_json: {
        method: "GET",
        path: "/v1/users/me",
        example_response: { data: { user: { id: "user_1", email: "...", role: "admin" } } }
      }
    },
    {
      type: "api_reference",
      title: "Update User",
      category: "users",
      body: `Update a user's profile or role.

Requires admin permissions to update other users.`,
      tags: ["users", "update"],
      metadata_json: {
        method: "PATCH",
        path: "/v1/users/:id",
        example_request: { name: "New Name", role: "admin" },
        example_response: { data: { user: { id: "user_1", name: "New Name" } } }
      }
    },
    {
      type: "api_reference",
      title: "List Activity",
      category: "activity",
      body: `Retrieve the activity log for your organization.

Includes all user and system actions.`,
      tags: ["activity", "audit", "log"],
      metadata_json: {
        method: "GET",
        path: "/v1/activity",
        example_request: { page: 1, pageSize: 50, user_id: "user_1" },
        example_response: { data: { items: [{ id: "act_1", action: "project.created" }] } }
      }
    },
    {
      type: "api_reference",
      title: "Get Organization",
      category: "organization",
      body: `Retrieve your organization details.

Includes plan information and usage statistics.`,
      tags: ["organization", "settings"],
      metadata_json: {
        method: "GET",
        path: "/v1/organization",
        example_response: { data: { organization: { id: "org_1", name: "Acme Inc", plan: "enterprise" } } }
      }
    },
    {
      type: "api_reference",
      title: "Update Organization",
      category: "organization",
      body: `Update organization settings.

Requires admin permissions.`,
      tags: ["organization", "settings", "update"],
      metadata_json: {
        method: "PATCH",
        path: "/v1/organization",
        example_request: { name: "New Org Name" },
        example_response: { data: { organization: { id: "org_1", name: "New Org Name" } } }
      }
    },
    {
      type: "api_reference",
      title: "Webhook Events",
      category: "webhooks",
      body: `List of all webhook event types.

Subscribe only to events you need to minimize unnecessary traffic.`,
      tags: ["webhooks", "events"],
      metadata_json: {
        events: [
          "project.created",
          "project.updated",
          "project.deleted",
          "user.invited",
          "user.removed",
          "api_key.created",
          "api_key.revoked"
        ]
      }
    },
    {
      type: "api_reference",
      title: "Test Webhook",
      category: "webhooks",
      body: `Send a test event to a webhook endpoint.

Useful for verifying your endpoint is configured correctly.`,
      tags: ["webhooks", "test"],
      metadata_json: {
        method: "POST",
        path: "/v1/webhooks/:id/test",
        example_response: { data: { delivered: true, response_code: 200 } }
      }
    },
    {
      type: "api_reference",
      title: "Pagination",
      category: "general",
      body: `All list endpoints support pagination.

Use page and pageSize parameters. Maximum pageSize is 100.`,
      tags: ["pagination", "general"],
      metadata_json: {
        parameters: {
          page: "Page number (1-based)",
          pageSize: "Items per page (1-100)"
        },
        response: {
          items: "Array of results",
          total: "Total count",
          page: "Current page",
          pageSize: "Items per page"
        }
      }
    }
  ];

  // ============================================
  // 4. CHANGELOG (~20 items)
  // ============================================
  const changelogItems = [
    {
      type: "changelog",
      title: "Version 2.5.0",
      category: "major",
      body: `## New Features
- **Team Workspaces**: Organize projects into team-specific workspaces
- **Advanced Search**: Full-text search across all resources
- **Bulk Operations**: Perform actions on multiple items

## Improvements
- Dashboard load time reduced by 40%
- Enhanced mobile responsiveness
- Improved error messages

## Bug Fixes
- Fixed pagination in activity log
- Resolved timezone display issues`,
      tags: ["release", "features"],
      metadata_json: { version: "2.5.0", release_date: "2026-01-15", breaking: false }
    },
    {
      type: "changelog",
      title: "Version 2.4.0",
      category: "minor",
      body: `## New Features
- Webhook retry configuration
- Custom export formats
- Keyboard shortcuts

## Improvements
- API response times improved
- Better rate limit headers`,
      tags: ["release"],
      metadata_json: { version: "2.4.0", release_date: "2025-12-01", breaking: false }
    },
    {
      type: "changelog",
      title: "Version 2.3.0 (Breaking)",
      category: "major",
      body: `## Breaking Changes
- API v1 date format changed to ISO 8601
- Deprecated endpoints removed

## Migration Guide
Update your date parsing to handle ISO 8601 format.
See migration guide for affected endpoints.

## New Features
- SAML SSO support
- Audit log export`,
      tags: ["release", "breaking-change"],
      metadata_json: {
        version: "2.3.0",
        release_date: "2025-11-01",
        breaking: true,
        migration_notes: "Update date parsing. deprecated /v0 endpoints removed."
      }
    },
    {
      type: "changelog",
      title: "Version 2.2.1",
      category: "patch",
      body: `## Security Update
- Fixed XSS vulnerability in comment rendering
- Updated dependencies with security patches

## Bug Fixes
- Fixed session timeout not working correctly
- Resolved intermittent API errors`,
      tags: ["security", "patch"],
      metadata_json: { version: "2.2.1", release_date: "2025-10-15", breaking: false }
    },
    {
      type: "changelog",
      title: "Version 2.2.0",
      category: "minor",
      body: `## New Features
- Dark mode support
- Custom dashboard layouts
- Email notification preferences

## Improvements
- Redesigned settings page
- Faster project creation`,
      tags: ["release", "features"],
      metadata_json: { version: "2.2.0", release_date: "2025-10-01", breaking: false }
    },
    {
      type: "changelog",
      title: "Version 2.1.0",
      category: "minor",
      body: `## New Features
- API key scopes
- Project templates
- Activity feed filtering

## Bug Fixes
- Fixed duplicate notifications
- Resolved export timeout issues`,
      tags: ["release"],
      metadata_json: { version: "2.1.0", release_date: "2025-09-01", breaking: false }
    },
    {
      type: "changelog",
      title: "Version 2.0.0 (Major)",
      category: "major",
      body: `## Major Release
Complete platform redesign with new features.

## Breaking Changes
- New authentication flow
- Updated API response format
- Removed legacy endpoints

## New Features
- New dashboard UI
- Real-time collaboration
- Advanced permissions

## Migration
See docs.adamant.example/migration/v2 for guide.`,
      tags: ["release", "major", "breaking-change"],
      metadata_json: {
        version: "2.0.0",
        release_date: "2025-08-01",
        breaking: true,
        migration_notes: "Major version upgrade. See migration guide for breaking changes."
      }
    },
    {
      type: "changelog",
      title: "Version 1.9.5",
      category: "patch",
      body: `## Bug Fixes
- Fixed memory leak in background jobs
- Resolved CSV export encoding issues
- Fixed timezone in email notifications`,
      tags: ["patch", "bugfix"],
      metadata_json: { version: "1.9.5", release_date: "2025-07-15", breaking: false }
    },
    {
      type: "changelog",
      title: "Version 1.9.0",
      category: "minor",
      body: `## New Features
- Webhook signature verification
- Batch delete operations
- User profile customization

## Improvements
- Optimized database queries
- Better error recovery`,
      tags: ["release"],
      metadata_json: { version: "1.9.0", release_date: "2025-07-01", breaking: false }
    },
    {
      type: "changelog",
      title: "Security Advisory 2025-001",
      category: "security",
      body: `## Security Update

### Affected Versions
- 2.1.x through 2.2.0

### Issue
Potential information disclosure in error responses.

### Resolution
Upgrade to 2.2.1 or later.

### Details
Error responses could include internal stack traces in certain conditions.`,
      tags: ["security", "advisory"],
      metadata_json: { version: "SA-2025-001", release_date: "2025-10-15", breaking: false }
    },
    {
      type: "changelog",
      title: "Version 1.8.0",
      category: "minor",
      body: `## New Features
- Two-factor authentication
- Session management
- IP allowlisting (Enterprise)`,
      tags: ["release", "security"],
      metadata_json: { version: "1.8.0", release_date: "2025-06-01", breaking: false }
    },
    {
      type: "changelog",
      title: "API Deprecation Notice",
      category: "deprecation",
      body: `## Deprecation Notice

### Deprecated Endpoints
- GET /v0/projects (use /v1/projects)
- POST /v0/auth (use /auth/token)

### Timeline
- Deprecated: 2025-06-01
- Removal: 2025-12-01

### Migration
Update to v1 endpoints. See API documentation.`,
      tags: ["deprecation", "api"],
      metadata_json: { version: "DEP-2025-001", release_date: "2025-06-01", breaking: false }
    },
    {
      type: "changelog",
      title: "Version 1.7.0",
      category: "minor",
      body: `## New Features
- Slack integration
- Custom fields
- Advanced filtering

## Bug Fixes
- Fixed search indexing delay
- Resolved pagination edge cases`,
      tags: ["release", "integration"],
      metadata_json: { version: "1.7.0", release_date: "2025-05-01", breaking: false }
    },
    {
      type: "changelog",
      title: "Version 1.6.0",
      category: "minor",
      body: `## New Features
- Project archiving
- Bulk import via CSV
- Email templates customization`,
      tags: ["release"],
      metadata_json: { version: "1.6.0", release_date: "2025-04-01", breaking: false }
    },
    {
      type: "changelog",
      title: "Infrastructure Update",
      category: "infrastructure",
      body: `## Infrastructure Update

### Changes
- Migrated to new data center
- Upgraded database cluster
- Improved CDN coverage

### Impact
- ~5 minutes downtime during migration
- Improved latency for EU/APAC users

### Date
Completed: 2025-03-15`,
      tags: ["infrastructure", "maintenance"],
      metadata_json: { version: "INFRA-2025-001", release_date: "2025-03-15", breaking: false }
    }
  ];

  // ============================================
  // 5. INCIDENTS (~10 items)
  // ============================================
  const incidentItems = [
    {
      type: "incidents",
      title: "API Outage - January 2026",
      category: "critical",
      body: `Complete API unavailability affecting all customers.

Root cause was a database connection pool exhaustion caused by a configuration change during routine maintenance.

All API requests returned 503 errors during the incident.`,
      tags: ["outage", "api", "database"],
      metadata_json: {
        severity: "critical",
        status: "resolved",
        duration_minutes: 45,
        impact: "100% of API requests failed. Dashboard inaccessible.",
        root_cause: "Database connection pool exhausted due to misconfigured pool size during maintenance.",
        remediation: "Reverted configuration. Implemented connection pool monitoring alerts.",
        timeline: [
          { time: "14:00 UTC", event: "Maintenance window started" },
          { time: "14:15 UTC", event: "Configuration change deployed" },
          { time: "14:22 UTC", event: "First alerts triggered" },
          { time: "14:25 UTC", event: "Incident declared" },
          { time: "14:45 UTC", event: "Configuration reverted" },
          { time: "15:00 UTC", event: "Full recovery confirmed" }
        ],
        follow_ups: [
          "Add connection pool size to pre-deployment checklist",
          "Implement automated rollback for connection issues",
          "Add synthetic monitoring for early detection"
        ]
      }
    },
    {
      type: "incidents",
      title: "Elevated Error Rates - December 2025",
      category: "major",
      body: `Elevated 5xx error rates on project creation endpoints.

Approximately 15% of project creation requests failed during the incident window.`,
      tags: ["errors", "api", "partial"],
      metadata_json: {
        severity: "major",
        status: "resolved",
        duration_minutes: 90,
        impact: "15% of project creation requests failed. Other endpoints unaffected.",
        root_cause: "Memory leak in project service caused by unclosed database connections.",
        remediation: "Deployed hotfix to properly close connections. Restarted affected instances.",
        timeline: [
          { time: "09:00 UTC", event: "Error rate increased" },
          { time: "09:30 UTC", event: "On-call paged" },
          { time: "10:00 UTC", event: "Root cause identified" },
          { time: "10:30 UTC", event: "Hotfix deployed" }
        ],
        follow_ups: [
          "Add memory monitoring per service",
          "Review all database connection handling"
        ]
      }
    },
    {
      type: "incidents",
      title: "Slow Dashboard Performance - November 2025",
      category: "minor",
      body: `Dashboard load times increased significantly for all users.

Average page load time increased from 1.5s to 8s.`,
      tags: ["performance", "dashboard"],
      metadata_json: {
        severity: "minor",
        status: "resolved",
        duration_minutes: 120,
        impact: "Dashboard slow but functional. API unaffected.",
        root_cause: "CDN cache invalidation affected static assets.",
        remediation: "Repopulated CDN cache. Reviewed cache invalidation procedures.",
        follow_ups: [
          "Implement cache warming after invalidation",
          "Add synthetic monitoring for page load times"
        ]
      }
    },
    {
      type: "incidents",
      title: "Authentication Service Degradation",
      category: "major",
      body: `Intermittent login failures for approximately 30 minutes.

SSO logins were unaffected. Only password-based authentication impacted.`,
      tags: ["auth", "login", "partial"],
      metadata_json: {
        severity: "major",
        status: "resolved",
        duration_minutes: 30,
        impact: "~20% of password logins failed. SSO unaffected.",
        root_cause: "Rate limiting misconfiguration on auth service after deployment.",
        remediation: "Corrected rate limit configuration. Implemented config validation.",
        follow_ups: [
          "Add config validation to deployment pipeline",
          "Implement gradual rollout for auth changes"
        ]
      }
    },
    {
      type: "incidents",
      title: "Data Export Delays",
      category: "minor",
      body: `Export jobs taking significantly longer than expected.

Large exports that normally complete in minutes took hours.`,
      tags: ["export", "performance", "jobs"],
      metadata_json: {
        severity: "minor",
        status: "resolved",
        duration_minutes: 240,
        impact: "Export jobs delayed but completed successfully.",
        root_cause: "Job queue worker pool reduced during scaling event.",
        remediation: "Restored worker pool. Added minimum worker count protection.",
        follow_ups: [
          "Implement job queue monitoring dashboard",
          "Add alerting for queue depth"
        ]
      }
    },
    {
      type: "incidents",
      title: "Webhook Delivery Failures",
      category: "major",
      body: `Webhooks not being delivered for approximately 2 hours.

Events were queued and delivered after resolution with delays.`,
      tags: ["webhooks", "delivery", "queue"],
      metadata_json: {
        severity: "major",
        status: "resolved",
        duration_minutes: 120,
        impact: "Webhook delivery delayed. No events lost.",
        root_cause: "Message queue certificate expired.",
        remediation: "Renewed certificate. Implemented cert expiry monitoring.",
        follow_ups: [
          "Add certificate expiry alerts",
          "Document certificate rotation procedure"
        ]
      }
    },
    {
      type: "incidents",
      title: "Database Failover Event",
      category: "minor",
      body: `Brief service interruption during database failover.

Automatic failover worked as expected with minimal impact.`,
      tags: ["database", "failover", "infrastructure"],
      metadata_json: {
        severity: "minor",
        status: "resolved",
        duration_minutes: 5,
        impact: "Brief connection errors during failover. Auto-recovered.",
        root_cause: "Primary database instance hardware issue triggered automatic failover.",
        remediation: "Failover completed successfully. Primary instance replaced.",
        follow_ups: [
          "Review failover testing schedule",
          "Update runbook with lessons learned"
        ]
      }
    },
    {
      type: "incidents",
      title: "Search Index Corruption",
      category: "major",
      body: `Search results returning incomplete or incorrect results.

Full reindex required to resolve.`,
      tags: ["search", "data", "index"],
      metadata_json: {
        severity: "major",
        status: "resolved",
        duration_minutes: 180,
        impact: "Search results unreliable. CRUD operations unaffected.",
        root_cause: "Index corruption during cluster rebalancing.",
        remediation: "Rebuilt search index from primary data store.",
        follow_ups: [
          "Implement search index consistency checks",
          "Add search result validation tests"
        ]
      }
    },
    {
      type: "incidents",
      title: "Email Notification Delays",
      category: "minor",
      body: `Email notifications delayed by 2-4 hours.

All emails eventually delivered.`,
      tags: ["email", "notifications", "delay"],
      metadata_json: {
        severity: "minor",
        status: "resolved",
        duration_minutes: 240,
        impact: "Email notifications delayed. No emails lost.",
        root_cause: "Email service provider experiencing high volume.",
        remediation: "Worked with provider to prioritize our traffic. Added backup provider.",
        follow_ups: [
          "Implement email provider failover",
          "Add email delivery latency monitoring"
        ]
      }
    },
    {
      type: "incidents",
      title: "Third-Party Integration Outage",
      category: "minor",
      body: `Slack integration unavailable for 1 hour.

Caused by Slack API outage, not Adamant systems.`,
      tags: ["integration", "slack", "third-party"],
      metadata_json: {
        severity: "minor",
        status: "resolved",
        duration_minutes: 60,
        impact: "Slack notifications not delivered. Queued for retry.",
        root_cause: "Slack API experiencing global outage.",
        remediation: "Waited for Slack recovery. Retried queued notifications.",
        follow_ups: [
          "Improve third-party status page monitoring",
          "Add user-facing integration status indicators"
        ]
      }
    }
  ];

  // ============================================
  // 6. SUPPORT CONVERSATIONS (~25 items)
  // ============================================
  const supportItems = [
    {
      type: "support",
      title: "Unable to upgrade subscription",
      category: "billing",
      body: `Customer reported error when attempting to upgrade from Standard to Enterprise plan.

Issue was caused by an expired payment method on file.

Resolved by guiding customer to update payment method before retrying upgrade.`,
      tags: ["billing", "upgrade", "payment"],
      metadata_json: {
        resolved: true,
        ticket_id: "SUP-2026-001",
        resolution: "Customer updated payment method. Upgrade completed successfully.",
        messages: [
          { role: "customer", content: "I'm trying to upgrade to Enterprise but getting an error. The page just shows 'Payment failed'." },
          { role: "agent", content: "I can see the issue. Your payment method on file expired last month. Could you update it in Settings > Billing > Payment Methods?" },
          { role: "customer", content: "Oh I see, let me update that now." },
          { role: "customer", content: "Done! The upgrade worked now. Thanks!" },
          { role: "agent", content: "Perfect! Your account is now on the Enterprise plan. Let me know if you need help with any Enterprise features." }
        ]
      }
    },
    {
      type: "support",
      title: "SSO login not working",
      category: "login",
      body: `Customer unable to log in via SAML SSO.

Error: "SAML assertion invalid"

Root cause was clock skew between IdP and our servers.`,
      tags: ["sso", "saml", "login"],
      metadata_json: {
        resolved: true,
        ticket_id: "SUP-2026-002",
        resolution: "Customer's IdP had incorrect time. NTP sync resolved the issue.",
        messages: [
          { role: "customer", content: "Our team can't log in with SSO anymore. We're all getting 'SAML assertion invalid' errors." },
          { role: "agent", content: "That error typically indicates a time synchronization issue. Can you check if your IdP server's clock is synchronized?" },
          { role: "customer", content: "Let me check with our IT team..." },
          { role: "customer", content: "You were right! The NTP service was stopped. They've restarted it and SSO is working now." },
          { role: "agent", content: "Glad that fixed it! SAML is sensitive to clock differences - we recommend keeping servers within 5 minutes of UTC." }
        ]
      }
    },
    {
      type: "support",
      title: "API returning 429 errors",
      category: "api",
      body: `Customer's integration hitting rate limits unexpectedly.

Investigation showed a bug in their retry logic causing request amplification.`,
      tags: ["api", "rate-limit", "integration"],
      metadata_json: {
        resolved: true,
        ticket_id: "SUP-2026-003",
        resolution: "Customer fixed retry logic that was causing exponential request growth.",
        messages: [
          { role: "customer", content: "We're getting constant 429 errors from the API. We haven't changed anything on our end." },
          { role: "agent", content: "Looking at your account, I see a massive spike in requests. You're making 50,000 requests per minute, which exceeds your 10,000/min limit." },
          { role: "customer", content: "That can't be right, we only have 100 users..." },
          { role: "agent", content: "Checking the request patterns, it looks like requests are being retried immediately on failure without any backoff. This creates a cascade effect." },
          { role: "customer", content: "Found it! Our error handler was retrying in a tight loop. Deploying a fix with exponential backoff now." }
        ]
      }
    },
    {
      type: "support",
      title: "Missing data after project deletion",
      category: "general",
      body: `Customer accidentally deleted a project and needs data recovery.

Explained soft delete policy and recovered data within retention window.`,
      tags: ["data-recovery", "deletion", "projects"],
      metadata_json: {
        resolved: true,
        ticket_id: "SUP-2026-004",
        resolution: "Project restored from soft delete within 30-day window.",
        messages: [
          { role: "customer", content: "I accidentally deleted our main project! Is there any way to recover it?" },
          { role: "agent", content: "Don't worry - deleted projects are recoverable for 30 days. I can restore it for you. Can you confirm the project name?" },
          { role: "customer", content: "Yes, it was called 'Production Analytics'" },
          { role: "agent", content: "I've restored the project. All data including settings, members, and configurations are back. You should see it in your dashboard now." },
          { role: "customer", content: "It's back! Thank you so much!" }
        ]
      }
    },
    {
      type: "support",
      title: "Webhook not receiving events",
      category: "api",
      body: `Customer's webhook endpoint not receiving any events.

Endpoint was returning 301 redirect, which we don't follow.`,
      tags: ["webhooks", "integration", "redirect"],
      metadata_json: {
        resolved: true,
        ticket_id: "SUP-2026-005",
        resolution: "Customer updated webhook URL to use HTTPS directly without redirect.",
        messages: [
          { role: "customer", content: "Our webhook isn't receiving any events. We've triple-checked the URL." },
          { role: "agent", content: "I tested your endpoint and it's returning a 301 redirect from HTTP to HTTPS. We don't follow redirects for security reasons." },
          { role: "customer", content: "Ah, we have an automatic redirect set up. Should I use the HTTPS URL directly?" },
          { role: "agent", content: "Yes, please update to https://your-domain.com/webhook directly. I'll resend the recent events once you confirm." }
        ]
      }
    },
    {
      type: "support",
      title: "Invoice discrepancy",
      category: "billing",
      body: `Customer questioned charges on their monthly invoice.

Explained prorated charges for mid-month seat additions.`,
      tags: ["billing", "invoice", "seats"],
      metadata_json: {
        resolved: true,
        ticket_id: "SUP-2026-006",
        resolution: "Explained prorated billing for added seats. Customer satisfied with explanation.",
        messages: [
          { role: "customer", content: "My invoice is higher than expected. I should be paying $500/month but was charged $650." },
          { role: "agent", content: "Let me check your account... I see you added 3 seats mid-month on the 15th. The extra $150 is the prorated charge for those seats." },
          { role: "customer", content: "Oh right, we did hire some new people. So next month it will be the full amount?" },
          { role: "agent", content: "Exactly. Next month you'll be charged $600 for the full 12 seats (10 original + 3 new, minus the prorated amount already paid)." }
        ]
      }
    },
    {
      type: "support",
      title: "Two-factor authentication locked out",
      category: "login",
      body: `Customer lost access to 2FA device and backup codes.

Verified identity and reset 2FA per security policy.`,
      tags: ["2fa", "login", "security"],
      metadata_json: {
        resolved: true,
        ticket_id: "SUP-2026-007",
        resolution: "Identity verified via video call. 2FA reset completed.",
        messages: [
          { role: "customer", content: "I got a new phone and can't log in anymore. I don't have my backup codes either." },
          { role: "agent", content: "I understand that's frustrating. For security, we need to verify your identity before resetting 2FA. Can you join a video call and show government ID?" },
          { role: "customer", content: "Yes, I can do that. When are you available?" },
          { role: "agent", content: "I've sent you a calendar link. After verification, I'll disable 2FA so you can log in and set it up again with your new device." }
        ]
      }
    },
    {
      type: "support",
      title: "Export timeout for large dataset",
      category: "feature-request",
      body: `Customer export failing for dataset with 1M+ records.

Suggested using the async bulk export feature.`,
      tags: ["export", "performance", "large-data"],
      metadata_json: {
        resolved: true,
        ticket_id: "SUP-2026-008",
        resolution: "Guided customer to use async bulk export API endpoint.",
        messages: [
          { role: "customer", content: "Trying to export our activity data but it keeps timing out. We have about 2 years of data." },
          { role: "agent", content: "The UI export has a timeout for very large datasets. For 1M+ records, I recommend using our async export API." },
          { role: "customer", content: "Is there documentation for that?" },
          { role: "agent", content: "Yes! Check docs.adamant.example/api/exports. Use POST /exports/async with your filters. You'll get an email with a download link when ready." }
        ]
      }
    },
    {
      type: "support",
      title: "API key not working",
      category: "api",
      body: `Customer's API key returning unauthorized errors.

Key had been revoked by another admin.`,
      tags: ["api-key", "auth", "permissions"],
      metadata_json: {
        resolved: true,
        ticket_id: "SUP-2026-009",
        resolution: "Identified revoked key. Customer created new key with correct permissions.",
        messages: [
          { role: "customer", content: "My API integration stopped working. Getting 'UNAUTHORIZED' on every request." },
          { role: "agent", content: "Looking at the audit log, I see that API key ending in 'x4kd' was revoked yesterday by admin@yourcompany.com. Was this intentional?" },
          { role: "customer", content: "No! That must have been an accident. Can we restore it?" },
          { role: "agent", content: "Revoked keys can't be restored for security reasons, but you can create a new one in Settings > API Keys with the same permissions." }
        ]
      }
    },
    {
      type: "support",
      title: "Custom domain SSL not working",
      category: "general",
      body: `Customer's custom domain showing SSL errors.

DNS records were misconfigured.`,
      tags: ["ssl", "custom-domain", "dns"],
      metadata_json: {
        resolved: true,
        ticket_id: "SUP-2026-010",
        resolution: "Customer corrected DNS CNAME record. SSL certificate auto-provisioned.",
        messages: [
          { role: "customer", content: "Our custom domain app.ourcompany.com is showing SSL errors." },
          { role: "agent", content: "Checking your DNS... the CNAME record is pointing to the wrong target. It should point to custom.adamant.example, not adamant.example." },
          { role: "customer", content: "Updated! How long until SSL works?" },
          { role: "agent", content: "DNS can take up to 48 hours to propagate, but usually it's faster. Our system will automatically provision an SSL certificate once it sees the correct DNS." }
        ]
      }
    },
    {
      type: "support",
      title: "User can't be removed from organization",
      category: "bug-report",
      body: `Admin unable to remove a specific user.

Bug in UI when user had active sessions.`,
      tags: ["bug", "users", "admin"],
      metadata_json: {
        resolved: true,
        ticket_id: "SUP-2026-011",
        resolution: "Known bug. Removed user via API as workaround. Bug fix deployed.",
        messages: [
          { role: "customer", content: "I'm trying to remove a user who left the company but the Remove button does nothing." },
          { role: "agent", content: "Can you tell me the user's email? I'll check if there's something blocking the removal." },
          { role: "customer", content: "It's john.doe@ourcompany.com" },
          { role: "agent", content: "I found a bug where users with active sessions couldn't be removed via UI. I've removed them via API and reported the bug. A fix is being deployed today." }
        ]
      }
    },
    {
      type: "support",
      title: "SCIM provisioning not syncing",
      category: "api",
      body: `Customer's SCIM integration not creating users.

Bearer token had expired.`,
      tags: ["scim", "provisioning", "sso"],
      metadata_json: {
        resolved: true,
        ticket_id: "SUP-2026-012",
        resolution: "Regenerated SCIM token. Provisioning resumed.",
        messages: [
          { role: "customer", content: "New employees aren't being provisioned automatically anymore. SCIM was working last month." },
          { role: "agent", content: "SCIM tokens expire after 90 days. Yours was created on October 1st and expired recently. You can regenerate it in Settings > SCIM." },
          { role: "customer", content: "Got it. Just regenerated and updated in Okta. Let me test..." },
          { role: "customer", content: "Working now! Maybe add an expiration warning email?" },
          { role: "agent", content: "Great feedback! I'll pass that to our product team." }
        ]
      }
    },
    {
      type: "support",
      title: "Dashboard showing stale data",
      category: "bug-report",
      body: `Customer seeing outdated metrics on dashboard.

Browser caching issue resolved by hard refresh.`,
      tags: ["dashboard", "cache", "data"],
      metadata_json: {
        resolved: true,
        ticket_id: "SUP-2026-013",
        resolution: "Browser cache issue. Hard refresh (Cmd+Shift+R) resolved it.",
        messages: [
          { role: "customer", content: "My dashboard is showing data from last week even though I know we've had activity today." },
          { role: "agent", content: "Can you try a hard refresh? On Mac: Cmd+Shift+R, on Windows: Ctrl+Shift+R. Sometimes the browser caches the dashboard aggressively." },
          { role: "customer", content: "That fixed it! Is this a known issue?" },
          { role: "agent", content: "We've been working on better cache invalidation. For now, a hard refresh once per session usually prevents this." }
        ]
      }
    },
    {
      type: "support",
      title: "Downgrade plan request",
      category: "billing",
      body: `Customer wants to downgrade from Enterprise to Standard.

Explained feature loss and data retention.`,
      tags: ["billing", "downgrade", "plan"],
      metadata_json: {
        resolved: true,
        ticket_id: "SUP-2026-014",
        resolution: "Scheduled downgrade for next billing cycle. Customer acknowledged feature loss.",
        messages: [
          { role: "customer", content: "We need to downgrade to Standard plan. How do we do that?" },
          { role: "agent", content: "I can help with that. Just so you're aware, you'll lose access to: SSO, advanced permissions, audit log (beyond 90 days), and dedicated support. Data is preserved." },
          { role: "customer", content: "We understand. Please proceed." },
          { role: "agent", content: "I've scheduled the downgrade for your next billing date (Feb 1). You'll have Enterprise access until then. Let me know if you change your mind." }
        ]
      }
    },
    {
      type: "support",
      title: "Slow page loads in specific region",
      category: "general",
      body: `Customer in Australia experiencing slow load times.

Routing issue to nearest CDN edge.`,
      tags: ["performance", "cdn", "region"],
      metadata_json: {
        resolved: true,
        ticket_id: "SUP-2026-015",
        resolution: "CDN routing issue resolved by provider. Normal latency restored.",
        messages: [
          { role: "customer", content: "Our Australian team is experiencing very slow page loads, around 10 seconds. US team is fine." },
          { role: "agent", content: "Running diagnostics... I see traffic from Sydney is being routed to US-West instead of our Sydney edge. This is a CDN routing issue." },
          { role: "customer", content: "Is there anything we can do on our end?" },
          { role: "agent", content: "This is on our side. I've escalated to our infrastructure team. Should be resolved within the hour. I'll update you." }
        ]
      }
    }
  ];

  // ============================================
  // 7. FEATURE FLAGS (~15 items)
  // ============================================
  const featureFlagItems = [
    {
      type: "feature_flags",
      title: "New Dashboard UI",
      category: "enabled",
      body: `New dashboard user interface with improved navigation and data visualization.

Includes redesigned sidebar, updated charts, and better mobile responsiveness.`,
      tags: ["ui", "dashboard", "redesign"],
      metadata_json: {
        flag_key: "new_dashboard_ui",
        rollout_percentage: 100,
        status: "enabled",
        target_segment: "All users",
        created_by: "product@adamant.example",
        notes: "Fully rolled out after successful beta. Old UI deprecated."
      }
    },
    {
      type: "feature_flags",
      title: "AI-Powered Search",
      category: "partial",
      body: `Natural language search using AI to understand user intent.

Currently in beta with selected customers.`,
      tags: ["ai", "search", "beta"],
      metadata_json: {
        flag_key: "ai_search_beta",
        rollout_percentage: 10,
        status: "partial",
        target_segment: "Enterprise customers, opted-in",
        created_by: "product@adamant.example",
        notes: "Monitoring latency and relevance scores. Expanding to 25% next week."
      }
    },
    {
      type: "feature_flags",
      title: "Dark Mode",
      category: "enabled",
      body: `Dark color theme for reduced eye strain and battery savings on OLED screens.`,
      tags: ["ui", "accessibility", "theme"],
      metadata_json: {
        flag_key: "dark_mode",
        rollout_percentage: 100,
        status: "enabled",
        target_segment: "All users",
        notes: "User preference stored in profile settings."
      }
    },
    {
      type: "feature_flags",
      title: "Advanced Analytics Dashboard",
      category: "partial",
      body: `Enhanced analytics with custom date ranges, comparison views, and export options.`,
      tags: ["analytics", "enterprise", "beta"],
      metadata_json: {
        flag_key: "advanced_analytics",
        rollout_percentage: 50,
        status: "partial",
        target_segment: "Enterprise plan",
        variants: [
          { name: "control", weight: 50 },
          { name: "treatment", weight: 50 }
        ],
        notes: "A/B testing engagement metrics. Results due end of month."
      }
    },
    {
      type: "feature_flags",
      title: "Bulk Import V2",
      category: "disabled",
      body: `New bulk import system with better error handling and larger file support.

Disabled due to performance issues discovered in testing.`,
      tags: ["import", "bulk", "disabled"],
      metadata_json: {
        flag_key: "bulk_import_v2",
        rollout_percentage: 0,
        status: "disabled",
        target_segment: "None",
        notes: "Disabled 2026-01-10 due to memory issues with files >100MB. Fix in progress."
      }
    },
    {
      type: "feature_flags",
      title: "Real-time Collaboration",
      category: "partial",
      body: `See other users viewing/editing the same resource in real-time.

Uses WebSocket connections for presence indicators.`,
      tags: ["collaboration", "real-time", "websocket"],
      metadata_json: {
        flag_key: "realtime_collab",
        rollout_percentage: 25,
        status: "partial",
        target_segment: "Team and Enterprise plans",
        notes: "Monitoring WebSocket connection stability. Gradual rollout."
      }
    },
    {
      type: "feature_flags",
      title: "Two-Click Export",
      category: "enabled",
      body: `Simplified export flow - select items and click export directly from list views.`,
      tags: ["export", "ux", "productivity"],
      metadata_json: {
        flag_key: "two_click_export",
        rollout_percentage: 100,
        status: "enabled",
        target_segment: "All users",
        notes: "Shipped in v2.5. Old export flow removed."
      }
    },
    {
      type: "feature_flags",
      title: "API Rate Limit Headers V2",
      category: "enabled",
      body: `Enhanced rate limit headers with more detailed information.

Includes rate limit by endpoint type.`,
      tags: ["api", "rate-limit", "headers"],
      metadata_json: {
        flag_key: "rate_limit_headers_v2",
        rollout_percentage: 100,
        status: "enabled",
        target_segment: "All API consumers",
        notes: "Backwards compatible. Old headers still present."
      }
    },
    {
      type: "feature_flags",
      title: "Smart Notifications",
      category: "partial",
      body: `AI-powered notification batching and prioritization.

Reduces notification volume while highlighting important items.`,
      tags: ["notifications", "ai", "beta"],
      metadata_json: {
        flag_key: "smart_notifications",
        rollout_percentage: 15,
        status: "partial",
        target_segment: "Users with >50 daily notifications",
        notes: "Testing effectiveness. Survey scheduled for participants."
      }
    },
    {
      type: "feature_flags",
      title: "Project Templates V2",
      category: "partial",
      body: `New template system with variables, conditional sections, and team sharing.`,
      tags: ["templates", "projects", "beta"],
      metadata_json: {
        flag_key: "project_templates_v2",
        rollout_percentage: 30,
        status: "partial",
        target_segment: "Enterprise plan",
        notes: "Positive feedback so far. Planning GA for next month."
      }
    },
    {
      type: "feature_flags",
      title: "Audit Log Search",
      category: "enabled",
      body: `Full-text search within audit logs.

Includes saved searches and alerts.`,
      tags: ["audit", "search", "enterprise"],
      metadata_json: {
        flag_key: "audit_log_search",
        rollout_percentage: 100,
        status: "enabled",
        target_segment: "Enterprise plan",
        notes: "Enterprise-only feature. Shipped in v2.4."
      }
    },
    {
      type: "feature_flags",
      title: "Webhook Retry UI",
      category: "enabled",
      body: `UI for viewing failed webhooks and manually retrying them.`,
      tags: ["webhooks", "ui", "reliability"],
      metadata_json: {
        flag_key: "webhook_retry_ui",
        rollout_percentage: 100,
        status: "enabled",
        target_segment: "All users with webhooks",
        notes: "Highly requested feature. Full rollout complete."
      }
    },
    {
      type: "feature_flags",
      title: "GraphQL API Beta",
      category: "disabled",
      body: `GraphQL API endpoint for more flexible queries.

Internal testing phase.`,
      tags: ["api", "graphql", "internal"],
      metadata_json: {
        flag_key: "graphql_api",
        rollout_percentage: 0,
        status: "disabled",
        target_segment: "Internal only",
        notes: "Internal testing. Not ready for customer access."
      }
    },
    {
      type: "feature_flags",
      title: "Mobile App Push Notifications",
      category: "partial",
      body: `Push notifications for mobile app users.

Testing notification delivery and opt-in rates.`,
      tags: ["mobile", "notifications", "push"],
      metadata_json: {
        flag_key: "mobile_push",
        rollout_percentage: 50,
        status: "partial",
        target_segment: "Mobile app users",
        notes: "Testing push delivery rates across iOS and Android."
      }
    }
  ];

  // ============================================
  // 8. ANALYTICS EVENTS (~20 items)
  // ============================================
  const analyticsItems = [
    {
      type: "analytics_events",
      title: "User Signed Up",
      category: "user",
      body: `Fired when a new user completes the signup flow.

Includes the signup source and any referral information.`,
      tags: ["signup", "acquisition", "core"],
      metadata_json: {
        event_name: "user_signed_up",
        when_fired: "After email verification is complete",
        properties: [
          { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
          { name: "signup_source", type: "string", required: true, description: "organic, referral, ad_campaign" },
          { name: "referral_code", type: "string", required: false, description: "Referral code if applicable" },
          { name: "plan", type: "string", required: true, description: "Initial plan selected" }
        ],
        sample_payload: {
          event: "user_signed_up",
          user_id: "user_abc123",
          signup_source: "referral",
          referral_code: "FRIEND20",
          plan: "standard"
        },
        dashboards: ["Acquisition Overview", "Referral Program"]
      }
    },
    {
      type: "analytics_events",
      title: "User Logged In",
      category: "user",
      body: `Fired on successful authentication.

Captures the authentication method used.`,
      tags: ["auth", "login", "core"],
      metadata_json: {
        event_name: "user_logged_in",
        when_fired: "After successful authentication",
        properties: [
          { name: "user_id", type: "string", required: true },
          { name: "auth_method", type: "string", required: true, description: "password, sso, magic_link" },
          { name: "mfa_used", type: "boolean", required: false }
        ],
        sample_payload: {
          event: "user_logged_in",
          user_id: "user_abc123",
          auth_method: "sso",
          mfa_used: true
        },
        dashboards: ["Security Overview", "User Activity"]
      }
    },
    {
      type: "analytics_events",
      title: "Project Created",
      category: "product",
      body: `Fired when a user creates a new project.

Key activation metric.`,
      tags: ["project", "activation", "core"],
      metadata_json: {
        event_name: "project_created",
        when_fired: "After project is saved to database",
        properties: [
          { name: "user_id", type: "string", required: true },
          { name: "project_id", type: "string", required: true },
          { name: "project_name", type: "string", required: true },
          { name: "template_used", type: "string", required: false },
          { name: "team_size", type: "number", required: false }
        ],
        sample_payload: {
          event: "project_created",
          user_id: "user_abc123",
          project_id: "proj_xyz",
          project_name: "My First Project",
          template_used: "basic"
        },
        dashboards: ["Activation Funnel", "Product Usage"]
      }
    },
    {
      type: "analytics_events",
      title: "Feature Used",
      category: "product",
      body: `Generic event for tracking feature usage.

Used to measure feature adoption and engagement.`,
      tags: ["feature", "engagement", "core"],
      metadata_json: {
        event_name: "feature_used",
        when_fired: "When user interacts with a tracked feature",
        properties: [
          { name: "user_id", type: "string", required: true },
          { name: "feature_name", type: "string", required: true },
          { name: "feature_category", type: "string", required: true },
          { name: "context", type: "object", required: false }
        ],
        sample_payload: {
          event: "feature_used",
          user_id: "user_abc123",
          feature_name: "bulk_export",
          feature_category: "data_management"
        },
        dashboards: ["Feature Adoption", "Product Usage"]
      }
    },
    {
      type: "analytics_events",
      title: "API Request Made",
      category: "system",
      body: `Fired for every API request.

Used for usage analytics and rate limit monitoring.`,
      tags: ["api", "usage", "system"],
      metadata_json: {
        event_name: "api_request",
        when_fired: "After API request completes",
        properties: [
          { name: "api_key_id", type: "string", required: true },
          { name: "endpoint", type: "string", required: true },
          { name: "method", type: "string", required: true },
          { name: "status_code", type: "number", required: true },
          { name: "latency_ms", type: "number", required: true }
        ],
        sample_payload: {
          event: "api_request",
          api_key_id: "key_abc",
          endpoint: "/v1/projects",
          method: "GET",
          status_code: 200,
          latency_ms: 45
        },
        dashboards: ["API Usage", "Performance Metrics"]
      }
    },
    {
      type: "analytics_events",
      title: "Subscription Changed",
      category: "commerce",
      body: `Fired when subscription plan changes.

Includes upgrade, downgrade, and cancellation.`,
      tags: ["billing", "subscription", "revenue"],
      metadata_json: {
        event_name: "subscription_changed",
        when_fired: "When subscription change is processed",
        properties: [
          { name: "user_id", type: "string", required: true },
          { name: "org_id", type: "string", required: true },
          { name: "previous_plan", type: "string", required: true },
          { name: "new_plan", type: "string", required: true },
          { name: "change_type", type: "string", required: true, description: "upgrade, downgrade, cancel" },
          { name: "mrr_change", type: "number", required: false }
        ],
        sample_payload: {
          event: "subscription_changed",
          user_id: "user_abc",
          org_id: "org_xyz",
          previous_plan: "standard",
          new_plan: "enterprise",
          change_type: "upgrade",
          mrr_change: 500
        },
        dashboards: ["Revenue Dashboard", "Churn Analysis"]
      }
    },
    {
      type: "analytics_events",
      title: "Invite Sent",
      category: "user",
      body: `Fired when a user invites someone to their organization.

Tracks viral growth.`,
      tags: ["invite", "growth", "viral"],
      metadata_json: {
        event_name: "invite_sent",
        when_fired: "When invitation email is sent",
        properties: [
          { name: "inviter_id", type: "string", required: true },
          { name: "invitee_email", type: "string", required: true },
          { name: "org_id", type: "string", required: true },
          { name: "role_assigned", type: "string", required: true }
        ],
        sample_payload: {
          event: "invite_sent",
          inviter_id: "user_abc",
          invitee_email: "new@example.com",
          org_id: "org_xyz",
          role_assigned: "member"
        },
        dashboards: ["Growth Metrics", "Team Expansion"]
      }
    },
    {
      type: "analytics_events",
      title: "Export Completed",
      category: "product",
      body: `Fired when a data export finishes.

Tracks export feature usage.`,
      tags: ["export", "data", "feature"],
      metadata_json: {
        event_name: "export_completed",
        when_fired: "When export file is ready for download",
        properties: [
          { name: "user_id", type: "string", required: true },
          { name: "export_type", type: "string", required: true },
          { name: "format", type: "string", required: true, description: "csv, json, jsonl" },
          { name: "record_count", type: "number", required: true },
          { name: "file_size_bytes", type: "number", required: true }
        ],
        sample_payload: {
          event: "export_completed",
          user_id: "user_abc",
          export_type: "projects",
          format: "jsonl",
          record_count: 1500,
          file_size_bytes: 2048576
        },
        dashboards: ["Feature Usage", "Data Export Metrics"]
      }
    },
    {
      type: "analytics_events",
      title: "Webhook Delivered",
      category: "system",
      body: `Fired when a webhook is successfully delivered.

Tracks webhook reliability.`,
      tags: ["webhook", "integration", "delivery"],
      metadata_json: {
        event_name: "webhook_delivered",
        when_fired: "After receiving 2xx response from endpoint",
        properties: [
          { name: "webhook_id", type: "string", required: true },
          { name: "event_type", type: "string", required: true },
          { name: "attempt_number", type: "number", required: true },
          { name: "response_time_ms", type: "number", required: true }
        ],
        sample_payload: {
          event: "webhook_delivered",
          webhook_id: "wh_abc",
          event_type: "project.created",
          attempt_number: 1,
          response_time_ms: 150
        },
        dashboards: ["Webhook Health", "Integration Metrics"]
      }
    },
    {
      type: "analytics_events",
      title: "Search Performed",
      category: "product",
      body: `Fired when user performs a search.

Used to improve search relevance.`,
      tags: ["search", "ux", "feature"],
      metadata_json: {
        event_name: "search_performed",
        when_fired: "When search query is executed",
        properties: [
          { name: "user_id", type: "string", required: true },
          { name: "query", type: "string", required: true },
          { name: "result_count", type: "number", required: true },
          { name: "filters_applied", type: "object", required: false }
        ],
        sample_payload: {
          event: "search_performed",
          user_id: "user_abc",
          query: "api integration",
          result_count: 15,
          filters_applied: { type: "docs" }
        },
        dashboards: ["Search Analytics", "Content Discovery"]
      }
    },
    {
      type: "analytics_events",
      title: "Error Occurred",
      category: "system",
      body: `Fired when an error is shown to user.

Tracks error frequency and types.`,
      tags: ["error", "ux", "monitoring"],
      metadata_json: {
        event_name: "error_occurred",
        when_fired: "When error message is displayed",
        properties: [
          { name: "user_id", type: "string", required: false },
          { name: "error_code", type: "string", required: true },
          { name: "error_message", type: "string", required: true },
          { name: "page", type: "string", required: true },
          { name: "action", type: "string", required: false }
        ],
        sample_payload: {
          event: "error_occurred",
          user_id: "user_abc",
          error_code: "VALIDATION_ERROR",
          error_message: "Invalid email format",
          page: "/settings/profile"
        },
        dashboards: ["Error Tracking", "UX Health"]
      }
    },
    {
      type: "analytics_events",
      title: "Page Viewed",
      category: "product",
      body: `Fired on every page view.

Core engagement metric.`,
      tags: ["pageview", "engagement", "core"],
      metadata_json: {
        event_name: "page_viewed",
        when_fired: "When page component mounts",
        properties: [
          { name: "user_id", type: "string", required: false },
          { name: "page_path", type: "string", required: true },
          { name: "page_title", type: "string", required: true },
          { name: "referrer", type: "string", required: false }
        ],
        sample_payload: {
          event: "page_viewed",
          user_id: "user_abc",
          page_path: "/dashboard",
          page_title: "Dashboard",
          referrer: "/login"
        },
        dashboards: ["Page Analytics", "User Journey"]
      }
    },
    {
      type: "analytics_events",
      title: "Trial Started",
      category: "commerce",
      body: `Fired when a trial period begins.

Key conversion metric.`,
      tags: ["trial", "conversion", "revenue"],
      metadata_json: {
        event_name: "trial_started",
        when_fired: "When trial is activated",
        properties: [
          { name: "user_id", type: "string", required: true },
          { name: "org_id", type: "string", required: true },
          { name: "trial_plan", type: "string", required: true },
          { name: "trial_days", type: "number", required: true }
        ],
        sample_payload: {
          event: "trial_started",
          user_id: "user_abc",
          org_id: "org_xyz",
          trial_plan: "enterprise",
          trial_days: 14
        },
        dashboards: ["Trial Metrics", "Conversion Funnel"]
      }
    },
    {
      type: "analytics_events",
      title: "Feedback Submitted",
      category: "product",
      body: `Fired when user submits feedback.

NPS, CSAT, and feature requests.`,
      tags: ["feedback", "nps", "voice-of-customer"],
      metadata_json: {
        event_name: "feedback_submitted",
        when_fired: "When feedback form is submitted",
        properties: [
          { name: "user_id", type: "string", required: true },
          { name: "feedback_type", type: "string", required: true, description: "nps, csat, feature_request, bug" },
          { name: "score", type: "number", required: false },
          { name: "comment", type: "string", required: false }
        ],
        sample_payload: {
          event: "feedback_submitted",
          user_id: "user_abc",
          feedback_type: "nps",
          score: 9,
          comment: "Love the new dashboard!"
        },
        dashboards: ["Customer Feedback", "NPS Tracking"]
      }
    }
  ];

  // ============================================
  // 9. PLAYBOOKS (~15 items)
  // ============================================
  const playbookItems = [
    {
      type: "playbooks",
      title: "On-Call Runbook: API Outage",
      category: "runbook",
      body: `This runbook covers the response procedure for API outages.

Use this when: Monitoring alerts for API availability drop below 99.5%.

Escalation: Page secondary on-call if not resolved within 30 minutes.`,
      tags: ["on-call", "api", "outage"],
      metadata_json: {
        type: "runbook",
        owner: "platform-team@adamant.example",
        last_reviewed: "2026-01-01",
        prerequisites: [
          "Access to AWS console",
          "VPN connected",
          "PagerDuty mobile app installed"
        ],
        steps: [
          { title: "Acknowledge Alert", description: "Acknowledge in PagerDuty within 5 minutes" },
          { title: "Check Status Page", description: "Verify status.adamant.example shows issue. Update if not." },
          { title: "Identify Scope", description: "Run: kubectl get pods -n production. Check for CrashLoopBackOff" },
          { title: "Check Logs", description: "Run: kubectl logs -l app=api --tail=100 -n production" },
          { title: "Check Database", description: "Verify database connectivity and connection pool" },
          { title: "Restart if Needed", description: "kubectl rollout restart deployment/api -n production" },
          { title: "Verify Recovery", description: "Monitor metrics for 15 minutes. Close incident if stable." }
        ],
        related_playbooks: ["Database Connection Issues", "Kubernetes Troubleshooting"]
      }
    },
    {
      type: "playbooks",
      title: "Deployment Checklist",
      category: "checklist",
      body: `Pre-deployment checklist for production releases.

All items must be checked before proceeding with deployment.`,
      tags: ["deployment", "release", "production"],
      metadata_json: {
        type: "checklist",
        owner: "release-team@adamant.example",
        last_reviewed: "2026-01-10",
        steps: [
          { title: "Code Review Approved", description: "All PRs have 2+ approvals" },
          { title: "Tests Passing", description: "CI pipeline green on main branch" },
          { title: "Staging Deployed", description: "Changes deployed to staging for 24+ hours" },
          { title: "QA Sign-off", description: "QA team has tested critical paths" },
          { title: "Documentation Updated", description: "API docs, changelog, release notes" },
          { title: "Feature Flags Configured", description: "New features behind flags if applicable" },
          { title: "Rollback Plan Ready", description: "Previous version tagged and deployable" },
          { title: "Monitoring Alerts Set", description: "Relevant alerts configured" },
          { title: "Stakeholders Notified", description: "Support, sales, and customers informed" }
        ]
      }
    },
    {
      type: "playbooks",
      title: "Troubleshooting: Slow Queries",
      category: "troubleshooting",
      body: `Guide for identifying and resolving slow database queries.

Use when: Database latency alerts trigger or users report slowness.`,
      tags: ["database", "performance", "troubleshooting"],
      metadata_json: {
        type: "troubleshooting",
        owner: "dba-team@adamant.example",
        last_reviewed: "2025-12-15",
        prerequisites: [
          "Database read-replica access",
          "Query analysis tools (pganalyze, explain)"
        ],
        steps: [
          { title: "Identify Slow Queries", description: "Check pg_stat_statements for queries over 1s average" },
          { title: "Analyze Query Plan", description: "Run EXPLAIN ANALYZE on problematic query" },
          { title: "Check for Missing Indexes", description: "Look for Seq Scan on large tables" },
          { title: "Review Table Statistics", description: "Run ANALYZE if stats are stale" },
          { title: "Check Connection Pool", description: "Verify pool isn't exhausted (pgbouncer stats)" },
          { title: "Consider Query Rewrite", description: "Optimize JOINs, add WHERE clauses" },
          { title: "Add Index if Needed", description: "Create index with CONCURRENTLY option" }
        ]
      }
    },
    {
      type: "playbooks",
      title: "Customer Data Export Request",
      category: "procedure",
      body: `Procedure for handling GDPR/CCPA data export requests.

SLA: Complete within 30 days of verified request.`,
      tags: ["gdpr", "ccpa", "compliance", "data"],
      metadata_json: {
        type: "procedure",
        owner: "privacy@adamant.example",
        last_reviewed: "2025-11-01",
        steps: [
          { title: "Verify Identity", description: "Confirm requester is the data subject or authorized rep" },
          { title: "Log Request", description: "Create ticket in privacy queue with all details" },
          { title: "Identify Data Scope", description: "List all systems containing user data" },
          { title: "Extract Data", description: "Run data export scripts for each system" },
          { title: "Compile Package", description: "Combine into single encrypted archive" },
          { title: "Review for PII", description: "Ensure no third-party PII is included" },
          { title: "Deliver Securely", description: "Send via secure file transfer, not email" },
          { title: "Document Completion", description: "Log completion date and delivery method" }
        ]
      }
    },
    {
      type: "playbooks",
      title: "New Employee Onboarding (Engineering)",
      category: "procedure",
      body: `Onboarding checklist for new engineering team members.

Complete within first 5 business days.`,
      tags: ["onboarding", "hr", "engineering"],
      metadata_json: {
        type: "procedure",
        owner: "engineering-ops@adamant.example",
        last_reviewed: "2026-01-05",
        steps: [
          { title: "Accounts Created", description: "GitHub, Slack, 1Password, AWS (read-only)" },
          { title: "Hardware Setup", description: "Laptop configured with dev environment" },
          { title: "Repository Access", description: "Added to relevant GitHub teams" },
          { title: "Dev Environment", description: "Local dev environment running" },
          { title: "First PR", description: "Completed a small starter task" },
          { title: "Architecture Overview", description: "Attended architecture walkthrough" },
          { title: "On-Call Training", description: "Shadowed on-call rotation" },
          { title: "Meet the Team", description: "1:1s scheduled with team members" }
        ]
      }
    },
    {
      type: "playbooks",
      title: "Incident Response: Security Breach",
      category: "runbook",
      body: `Response procedure for confirmed or suspected security breaches.

IMPORTANT: Do not discuss externally until cleared by Legal.`,
      tags: ["security", "incident", "breach"],
      metadata_json: {
        type: "runbook",
        owner: "security@adamant.example",
        last_reviewed: "2025-12-01",
        prerequisites: [
          "Security team lead available",
          "Legal counsel on standby",
          "Executive sponsor identified"
        ],
        steps: [
          { title: "Contain Immediately", description: "Isolate affected systems. Revoke compromised credentials." },
          { title: "Assemble Team", description: "Security, Engineering, Legal, Communications" },
          { title: "Assess Scope", description: "Determine what data/systems were accessed" },
          { title: "Preserve Evidence", description: "Snapshot affected systems. Preserve logs." },
          { title: "Notify Leadership", description: "Brief executives within 1 hour" },
          { title: "Regulatory Assessment", description: "Determine notification requirements (72h for GDPR)" },
          { title: "Customer Communication", description: "Draft notification with Legal approval" },
          { title: "Remediation", description: "Fix vulnerability. Rotate all secrets." },
          { title: "Post-Incident Review", description: "Conduct RCA within 5 business days" }
        ]
      }
    },
    {
      type: "playbooks",
      title: "Database Migration Procedure",
      category: "procedure",
      body: `Procedure for running database migrations in production.

Schedule during low-traffic windows when possible.`,
      tags: ["database", "migration", "deployment"],
      metadata_json: {
        type: "procedure",
        owner: "platform-team@adamant.example",
        last_reviewed: "2025-11-15",
        steps: [
          { title: "Review Migration", description: "Check for long-running operations, locks" },
          { title: "Test on Staging", description: "Run migration on staging with prod-like data" },
          { title: "Backup Database", description: "Create point-in-time backup before migration" },
          { title: "Announce Maintenance", description: "Post to status page if >5min expected" },
          { title: "Run Migration", description: "Execute migration with monitoring" },
          { title: "Verify Data", description: "Run validation queries" },
          { title: "Monitor Performance", description: "Watch for degradation for 30 minutes" },
          { title: "Update Runbook", description: "Document any issues encountered" }
        ]
      }
    },
    {
      type: "playbooks",
      title: "Troubleshooting: Webhook Failures",
      category: "troubleshooting",
      body: `Guide for investigating webhook delivery failures.

Use when: Customer reports missing webhooks or high failure rate.`,
      tags: ["webhooks", "troubleshooting", "integration"],
      metadata_json: {
        type: "troubleshooting",
        owner: "platform-team@adamant.example",
        last_reviewed: "2025-12-20",
        steps: [
          { title: "Check Webhook Logs", description: "View delivery attempts in admin panel" },
          { title: "Identify Error Type", description: "Connection timeout? SSL error? 4xx/5xx?" },
          { title: "Test Endpoint", description: "curl the endpoint manually" },
          { title: "Check SSL Certificate", description: "Verify cert is valid and not expired" },
          { title: "Review Payload Size", description: "Ensure payload isn't exceeding limits" },
          { title: "Check Rate Limits", description: "Verify customer endpoint can handle volume" },
          { title: "Retry Failed Events", description: "Use admin tool to replay events" }
        ]
      }
    },
    {
      type: "playbooks",
      title: "Feature Flag Rollout",
      category: "procedure",
      body: `Standard procedure for rolling out features via feature flags.

Enables safe, gradual releases with easy rollback.`,
      tags: ["feature-flags", "rollout", "deployment"],
      metadata_json: {
        type: "procedure",
        owner: "product-team@adamant.example",
        last_reviewed: "2026-01-01",
        steps: [
          { title: "Create Flag", description: "Add flag in feature flag service" },
          { title: "Internal Testing", description: "Enable for @adamant.example users" },
          { title: "Beta Group", description: "Enable for opted-in beta customers" },
          { title: "Monitor Metrics", description: "Watch error rates, performance, feedback" },
          { title: "Gradual Rollout", description: "10% → 25% → 50% → 100% over days" },
          { title: "Document Issues", description: "Log any problems for post-mortem" },
          { title: "Remove Flag", description: "Clean up flag code after 100% stable" }
        ]
      }
    },
    {
      type: "playbooks",
      title: "Customer Escalation Handling",
      category: "procedure",
      body: `Procedure for handling escalated customer issues.

Escalations come from support, sales, or executives.`,
      tags: ["support", "escalation", "customer-success"],
      metadata_json: {
        type: "procedure",
        owner: "customer-success@adamant.example",
        last_reviewed: "2025-10-15",
        steps: [
          { title: "Acknowledge Quickly", description: "Respond within 15 minutes" },
          { title: "Gather Context", description: "Review ticket history, account status" },
          { title: "Identify Owner", description: "Assign appropriate team (support, eng, product)" },
          { title: "Set Expectations", description: "Communicate timeline to customer" },
          { title: "Regular Updates", description: "Update customer every 4 hours minimum" },
          { title: "Resolve Issue", description: "Implement fix or workaround" },
          { title: "Follow Up", description: "Check satisfaction 24h after resolution" },
          { title: "Document Learnings", description: "Add to KB if recurring issue" }
        ]
      }
    },
    {
      type: "playbooks",
      title: "SSL Certificate Renewal",
      category: "procedure",
      body: `Procedure for renewing SSL certificates.

Certificates should be renewed 30 days before expiry.`,
      tags: ["ssl", "certificates", "security"],
      metadata_json: {
        type: "procedure",
        owner: "security@adamant.example",
        last_reviewed: "2025-11-01",
        steps: [
          { title: "Generate CSR", description: "Create Certificate Signing Request" },
          { title: "Submit to CA", description: "Submit CSR to certificate authority" },
          { title: "Validate Domain", description: "Complete domain validation" },
          { title: "Download Certificate", description: "Retrieve issued certificate" },
          { title: "Install Certificate", description: "Deploy to load balancers" },
          { title: "Verify Installation", description: "Test with SSL checker tool" },
          { title: "Update Monitoring", description: "Verify expiry alerts updated" }
        ]
      }
    },
    {
      type: "playbooks",
      title: "Capacity Planning Review",
      category: "procedure",
      body: `Monthly capacity planning review process.

Ensures infrastructure scales ahead of demand.`,
      tags: ["capacity", "planning", "infrastructure"],
      metadata_json: {
        type: "procedure",
        owner: "platform-team@adamant.example",
        last_reviewed: "2026-01-01",
        steps: [
          { title: "Gather Metrics", description: "Pull CPU, memory, disk, network trends" },
          { title: "Project Growth", description: "Estimate 3-month growth based on trends" },
          { title: "Identify Bottlenecks", description: "Find services approaching limits" },
          { title: "Cost Analysis", description: "Review infrastructure spend vs budget" },
          { title: "Plan Scaling", description: "Schedule scaling actions if needed" },
          { title: "Document Decisions", description: "Record capacity decisions and rationale" },
          { title: "Review with Stakeholders", description: "Present to engineering leadership" }
        ]
      }
    }
  ];

  // Insert all items
  const allItems = [
    ...docsItems.map((item) => ({
      ...item,
      owner_id: getOwnerId(),
      created_at: randomDateWithinDays(180),
      updated_at: randomDateWithinDays(30)
    })),
    ...policyItems.map((item) => ({
      ...item,
      owner_id: getOwnerId(),
      created_at: randomDateWithinDays(365),
      updated_at: randomDateWithinDays(60)
    })),
    ...apiItems.map((item) => ({
      ...item,
      owner_id: getOwnerId(),
      created_at: randomDateWithinDays(120),
      updated_at: randomDateWithinDays(30)
    })),
    ...changelogItems.map((item) => ({
      ...item,
      owner_id: getOwnerId(),
      created_at: randomDateWithinDays(365),
      updated_at: randomDateWithinDays(90)
    })),
    ...incidentItems.map((item) => ({
      ...item,
      owner_id: getOwnerId(),
      created_at: randomDateWithinDays(365),
      updated_at: randomDateWithinDays(180)
    })),
    ...supportItems.map((item) => ({
      ...item,
      owner_id: getOwnerId(),
      created_at: randomDateWithinDays(90),
      updated_at: randomDateWithinDays(30)
    })),
    ...featureFlagItems.map((item) => ({
      ...item,
      owner_id: getOwnerId(),
      created_at: randomDateWithinDays(180),
      updated_at: randomDateWithinDays(14)
    })),
    ...analyticsItems.map((item) => ({
      ...item,
      owner_id: getOwnerId(),
      created_at: randomDateWithinDays(365),
      updated_at: randomDateWithinDays(60)
    })),
    ...playbookItems.map((item) => ({
      ...item,
      owner_id: getOwnerId(),
      created_at: randomDateWithinDays(180),
      updated_at: randomDateWithinDays(45)
    }))
  ];

  // Insert in chunks
  const chunkSize = 20;
  for (let i = 0; i < allItems.length; i += chunkSize) {
    await knex("knowledge_items").insert(allItems.slice(i, i + chunkSize));
  }

  console.log(`Seeded ${allItems.length} knowledge items`);
}
