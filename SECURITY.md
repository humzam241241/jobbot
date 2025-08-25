# Security Policy

## Reporting a Security Issue

If you discover a security vulnerability in this project, please follow these steps to responsibly disclose it:

1. **Do not** create a public GitHub issue for the vulnerability.
2. Email us at [security@example.com](mailto:security@example.com) with a description of the issue, the steps you took to create it, affected versions, and if known, mitigations for the issue.
3. Allow some time for us to respond to the issue before any public disclosure.

We appreciate your help in keeping this project and its users secure.

## API Keys and Secrets

This project uses various API keys and secrets for authentication and service integration:

1. **Never commit API keys or secrets to the repository**
2. Always use environment variables (`.env` files) for sensitive information
3. The `.env.example` file provides templates for required environment variables, but does not contain actual secrets
4. In production environments, use secure secret management systems appropriate for your deployment platform

## What to Do If You Accidentally Commit a Secret

If you accidentally commit a secret:

1. **Revoke the secret immediately** - Generate new API keys/tokens for any exposed credentials
2. **Do not** try to remove the secret from Git history with force pushes or filter-branch, as this can cause issues for other contributors
3. Contact the project maintainers to help with proper secret rotation and cleanup

## Secret Cleanup

If secrets appear in the Git history, use [git-filter-repo](https://github.com/newren/git-filter-repo) to properly remove them:

```bash
# Install git-filter-repo
pip install git-filter-repo

# Clone a fresh copy of the repo
git clone --mirror https://github.com/your-username/your-repo.git
cd your-repo.git

# Remove the secret (replace SECRET_VALUE with the actual secret)
git filter-repo --replace-text <(echo "SECRET_VALUE==>REMOVED_SECRET")

# Push the cleaned history
git push --force origin --all
git push --force origin --tags
```

Note: This will rewrite Git history and require all collaborators to re-clone or carefully reset their local repositories.

## Security Best Practices

When contributing to this project:

1. Keep dependencies updated to minimize vulnerability exposure
2. Follow secure coding practices
3. Validate and sanitize all user inputs
4. Use proper authentication and authorization checks
5. Apply the principle of least privilege for API keys and service accounts
6. Regularly scan for vulnerabilities in dependencies
