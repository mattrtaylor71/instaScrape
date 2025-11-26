# Quick AWS Deployment Guide

## 🚀 Fastest Method: AWS Amplify (5 minutes)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Ready for deployment"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 2: Deploy via AWS Console
1. Go to https://console.aws.amazon.com/amplify
2. Click **"New app"** → **"Host web app"**
3. Choose **GitHub** and authorize
4. Select your repository and branch
5. AWS will auto-detect Next.js - click **"Next"**
6. **Add Environment Variables:**
   - `APIFY_TOKEN` = your Apify token
   - `OPENAI_API_KEY` = your OpenAI key
7. Click **"Save and deploy"**

### Step 3: Wait ~5 minutes
AWS will build and deploy your app automatically.

### Step 4: Access Your App
You'll get a URL like: `https://main.xxxxxxxxx.amplifyapp.com`

**That's it!** Your app is live. 🎉

---

## 🔄 Automatic Deployments

Every time you push to your main branch, AWS Amplify will automatically redeploy your app.

---

## 💰 Cost

- **Free tier**: 15 build minutes/month, 5GB storage, 15GB served/month
- **After free tier**: ~$0-5/month for low traffic
- **Your app**: Likely $0/month if you're just testing

---

## 🛠️ Troubleshooting

**Build fails?**
- Check the build logs in AWS Amplify console
- Make sure environment variables are set correctly

**Environment variables not working?**
- Go to App settings → Environment variables
- Make sure they're added and saved
- Redeploy after adding variables

**Need to update code?**
- Just push to GitHub
- AWS Amplify will auto-deploy

---

## 📝 Alternative: Manual Lambda Deployment

If you prefer Lambda, see [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

But honestly, **AWS Amplify is way easier** for Next.js apps! 😊

