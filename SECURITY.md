# Security Policy

DDS is a local-first project that handles potentially sensitive Discord content. Security and privacy bugs should be treated seriously.

## Supported version

The current supported BetterDiscord Plugin release is:

| Version | Supported |
|---|---|
| `0.5.2` | Yes |
| Older releases | Historical only |

`0.5.0` and `0.5.1` are explicitly documented as broken runtime releases and should not be used for normal operation.

## Security boundary

DDS BetterDiscord Plugin is intended to:

- read only Discord context already available to the signed-in client;
- create structured local captures;
- write those captures to local DDS storage;
- avoid credential/token extraction;
- avoid hidden-history fetching;
- avoid external transmission of capture data.

Changes that violate this boundary must be treated as security-sensitive design changes, not ordinary refactors.

## Reporting a vulnerability

Please do **not** publish passwords, authentication tokens, private Discord content, personal data, or other secrets in a public GitHub issue.

For a security report, contact the repository owner privately through an appropriate private channel. Include:

- affected DDS version;
- operating system;
- Discord / BetterDiscord context;
- concise reproduction steps;
- observed behavior;
- expected behavior;
- whether sensitive data was exposed or transmitted.

Public issues are appropriate for non-sensitive bugs that do not require disclosure of private data.

## Sensitive test data

Never commit:

- `DDS_Data/` captures from a real account;
- Discord tokens or session credentials;
- `.env` files containing secrets;
- private message exports;
- private screenshots or logs containing account data unless they have been sanitized.

The repository `.gitignore` excludes common local secret files and `DDS_Data/`, but contributors remain responsible for reviewing commits before pushing them.
