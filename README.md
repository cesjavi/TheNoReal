pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Environment variables

Copy the example file and provide your own values:

```bash
cp .env.example .env.local
```

Set `GROQ_API_KEY` to a valid token from Groq (the previously committed key has been revoked) and update `DATABASE_URL` for your database. ` .env.local` is ignored by git and should not be committed.

Next.js will load variables from `.env.local` in development. For deployments, configure these environment variables through your hosting provider.

## Cargar la PWA en React Native/Expo

Para empaquetar esta PWA dentro de una app móvil:

1. **Crear un proyecto móvil** con React Native o Expo.
2. **Instalar WebView**:
   - React Native: `npm install react-native-webview` y luego `npx pod-install` en iOS.
   - Expo: `expo install react-native-webview`.
3. **Utilizar el WebView** para apuntar a la URL pública de la PWA:

   ```tsx
   import { WebView } from "react-native-webview";

   export default function App() {
     return <WebView source={{ uri: "https://tusitio.com" }} style={{ flex: 1 }} />;
   }
   ```

4. **Generar el APK**:
   - React Native CLI: `npx react-native run-android --variant release`.
   - Expo: usar `eas build -p android` o `expo build:android`.

El WebView cargará la PWA y permitirá publicar la experiencia como aplicación nativa.