import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import {
  AnalyticsPage,
  CampaignEditorPage,
  CampaignsPage,
  NewCampaignPage,
  OverviewPage,
  SegmentsPage,
  SubscribersPage,
  TemplatesPage,
} from "./pages/Mailcraft";
import { AutomationsPage, SettingsPage } from "./pages/Operations";
import { AdminPage } from "./pages/AdminRedirect";
import { MediaLibraryPage } from "./pages/MediaLibrary";
import { SendingProfilesPage } from "./pages/SendingProfiles";
import { ImageLibraryBridge } from "./components/ImageLibraryBridge";

function AppShell() {
  return <DashboardLayout><Switch><Route path="/" component={OverviewPage} /><Route path="/campaigns/new" component={NewCampaignPage} /><Route path="/campaigns/:id/analytics" component={AnalyticsPage} /><Route path="/campaigns/:id" component={CampaignEditorPage} /><Route path="/campaigns" component={CampaignsPage} /><Route path="/subscribers" component={SubscribersPage} /><Route path="/segments" component={SegmentsPage} /><Route path="/templates" component={TemplatesPage} /><Route path="/media" component={MediaLibraryPage} /><Route path="/sending" component={SendingProfilesPage} /><Route path="/automations" component={AutomationsPage} /><Route path="/settings" component={SettingsPage} /><Route path="/admin" component={AdminPage} /><Route component={OverviewPage} /></Switch><ImageLibraryBridge /></DashboardLayout>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors position="top-right" /><AppShell /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
