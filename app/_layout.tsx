import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Toaster } from "fulltoast";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider } from "@/contexts/AppContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back", headerShown: false }}>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="video-intro" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Toaster
          position="top-center"
          theme="light"
          offset={{ top: 56, left: 16, right: 16 }}
          options={{
            fill: Colors.dark.surfaceElevated,
            textColor: Colors.dark.text,
            roundness: 18,
            styles: {
              container: {
                borderWidth: 1,
                borderColor: Colors.dark.border,
              },
              description: {
                color: Colors.dark.textSecondary,
              },
              button: {
                backgroundColor: Colors.dark.primary,
              },
              buttonText: {
                color: Colors.dark.text,
              },
            },
          }}
        >
          <LanguageProvider>
            <AppProvider>
              <RootLayoutNav />
            </AppProvider>
          </LanguageProvider>
        </Toaster>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
