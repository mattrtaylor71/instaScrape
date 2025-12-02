#!/bin/bash

# Script to package Lambda function for manual deployment

echo "📦 Packaging Lambda function for deployment..."

# Create deployment package
zip -r function.zip scrape-handler.js node_modules/ package.json 2>/dev/null || {
  echo "Creating function.zip..."
  zip -r function.zip scrape-handler.js package.json
  echo "⚠️  Note: node_modules not included. You'll need to install dependencies in Lambda."
}

echo ""
echo "✅ Package created: function.zip"
echo ""
echo "📋 Next steps:"
echo "1. Go to AWS Lambda Console: https://console.aws.amazon.com/lambda/"
echo "2. Click 'Create function'"
echo "3. Choose 'Author from scratch'"
echo "4. Function name: instagram-scrape-lambda"
echo "5. Runtime: Node.js 18.x"
echo "6. Click 'Create function'"
echo "7. Upload function.zip as the code"
echo "8. Set timeout to 900 seconds (15 minutes)"
echo "9. Set memory to 1024 MB"
echo "10. Add environment variable: APIFY_TOKEN = your_token"
echo "11. Save and test!"
echo ""
echo "Then set in Amplify Console:"
echo "  SCRAPE_LAMBDA_FUNCTION_NAME=instagram-scrape-lambda"
echo "  LAMBDA_REGION=us-east-1 (or your region)"

