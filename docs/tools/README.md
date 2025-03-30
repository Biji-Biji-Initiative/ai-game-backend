# Documentation Verification Tools

This directory contains tools used to verify, check, and maintain the AI Gaming Backend documentation.

## Available Tools

1. **Link Checker**: Verifies that all links in markdown documentation are valid
2. **Verification Checklist**: Template for SMEs to use when reviewing documentation

## Getting Started

### Prerequisites

- Node.js 14.0 or higher
- NPM or Yarn

### Installation

```bash
# Navigate to the tools directory
cd docs/tools

# Install dependencies
npm install
```

## Using the Tools

### Link Checker

This tool scans all markdown files in the documentation directory and verifies that all links (both internal and external) are valid.

```bash
# Check links in all documentation
npm run check-links

# Check links in a specific directory
node link-checker.js ../guides

# Check links in a specific file
node link-checker.js ../README.md
```

#### Link Checker Output

The link checker will output:
- A summary of all links checked
- Detailed information about broken links
- A list of files with broken links

### Verification Checklist

The verification checklist (`verification-checklist.md`) is a template that subject matter experts should use when reviewing documentation.

To use the checklist:

1. Copy the template for each document being reviewed
2. Fill in the checklist sections as you review the document
3. Note any issues found in the appropriate section
4. Submit the completed checklist to the documentation team

## Adding New Tools

If you develop a new documentation verification tool:

1. Add the tool to this directory
2. Update the README to document the tool
3. Add any necessary scripts to `package.json`
4. Ensure the tool follows our code standards
5. Create a pull request for review

## Troubleshooting

### Common Issues

- **Link Checker Rate Limiting**: External sites may rate-limit the link checker. Consider adding a delay between requests if you encounter this issue.
- **Node Version Errors**: Make sure you're using Node.js 14.0 or higher. The link checker uses modern JavaScript features.

## Contributing

When contributing to these tools:

1. Follow the coding standards defined in our main project
2. Add appropriate comments and documentation
3. Update this README as needed to reflect changes 