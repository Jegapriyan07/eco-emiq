import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import PricingPage from './pages/auth/PricingPage';

// Vehicle Owner Pages
import VehicleOwnerDashboard from './pages/vehicle-owner/Dashboard';
import TimelinePage from './pages/vehicle-owner/Timeline';
import VehicleMaintenancePage from './pages/vehicle-owner/Maintenance';
import EcoTipsPage from './pages/vehicle-owner/EcoTips';
import VehicleGovernancePage from './pages/vehicle-owner/Governance';

// Generator Owner Pages
import GeneratorOwnerDashboard from './pages/generator-owner/Dashboard';
import PerformancePage from './pages/generator-owner/Performance';
import LogsPage from './pages/generator-owner/Logs';
import GeneratorGovernancePage from './pages/generator-owner/Governance';

// Industry Owner Pages
import IndustryOwnerDashboard from './pages/industry-owner/Dashboard';
import CompliancePage from './pages/industry-owner/Compliance';
import AnomaliesPage from './pages/industry-owner/Anomalies';
import OrganizationPage from './pages/industry-owner/Organization';
import IndustryGovernancePage from './pages/industry-owner/Governance';

// City Admin Pages
import CityAdminDashboard from './pages/city-admin/Dashboard';
import WardAnalyticsPage from './pages/city-admin/WardAnalytics';
import AlertsPage from './pages/city-admin/Alerts';
import PolicyPage from './pages/city-admin/Policy';
import PredictionsPage from './pages/city-admin/Predictions';
import CityAdminGovernancePage from './pages/city-admin/Governance';

// Shared Pages
import DevicesPage from './pages/shared/DevicesPage';
import MaintenancePage from './pages/shared/MaintenancePage';

// Protected Route Components
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';

// Accessibility Component
import AccessibilityWidget from './components/AccessibilityWidget';

function App() {
    const { isAuthenticated, user } = useAuthStore();

    return (
        <>
            <AccessibilityWidget />
            <Routes>
                {/* Public Routes */}
                <Route element={<AuthLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/pricing" element={<PricingPage />} />
                </Route>

                {/* Protected Routes */}
                <Route
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    {/* Vehicle Owner Routes */}
                    <Route
                        path="/vehicle-owner/*"
                        element={
                            <RoleRoute allowedRoles={['vehicle_owner']}>
                                <Routes>
                                    <Route path="/" element={<VehicleOwnerDashboard />} />
                                    <Route path="/timeline" element={<TimelinePage />} />
                                    <Route path="/maintenance" element={<VehicleMaintenancePage />} />
                                    <Route path="/tips" element={<EcoTipsPage />} />
                                    <Route path="/devices" element={<DevicesPage />} />
                                    <Route path="/governance" element={<VehicleGovernancePage />} />
                                </Routes>
                            </RoleRoute>
                        }
                    />

                    {/* Generator Owner Routes */}
                    <Route
                        path="/generator-owner/*"
                        element={
                            <RoleRoute allowedRoles={['generator_owner']}>
                                <Routes>
                                    <Route path="/" element={<GeneratorOwnerDashboard />} />
                                    <Route path="/performance" element={<PerformancePage />} />
                                    <Route path="/maintenance" element={<MaintenancePage />} />
                                    <Route path="/control" element={<GeneratorOwnerDashboard />} />
                                    <Route path="/logs" element={<LogsPage />} />
                                    <Route path="/governance" element={<GeneratorGovernancePage />} />
                                </Routes>
                            </RoleRoute>
                        }
                    />

                    {/* Industry Owner Routes */}
                    <Route
                        path="/industry-owner/*"
                        element={
                            <RoleRoute allowedRoles={['industry_owner']}>
                                <Routes>
                                    <Route path="/" element={<IndustryOwnerDashboard />} />
                                    <Route path="/compliance" element={<CompliancePage />} />
                                    <Route path="/maintenance" element={<MaintenancePage />} />
                                    <Route path="/anomalies" element={<AnomaliesPage />} />
                                    <Route path="/organization" element={<OrganizationPage />} />
                                    <Route path="/governance" element={<IndustryGovernancePage />} />
                                </Routes>
                            </RoleRoute>
                        }
                    />

                    {/* City Admin Routes */}
                    <Route
                        path="/city-admin/*"
                        element={
                            <RoleRoute allowedRoles={['city_admin']}>
                                <Routes>
                                    <Route path="/" element={<CityAdminDashboard />} />
                                    <Route path="/wards" element={<WardAnalyticsPage />} />
                                    <Route path="/devices" element={<DevicesPage />} />
                                    <Route path="/alerts" element={<AlertsPage />} />
                                    <Route path="/policy" element={<PolicyPage />} />
                                    <Route path="/predictions" element={<PredictionsPage />} />
                                    <Route path="/governance" element={<CityAdminGovernancePage />} />
                                </Routes>
                            </RoleRoute>
                        }
                    />
                </Route>

                {/* Default Redirect */}
                <Route
                    path="/"
                    element={
                        isAuthenticated ? (
                            <Navigate
                                to={
                                    user?.role === 'vehicle_owner' ? '/vehicle-owner' :
                                        user?.role === 'generator_owner' ? '/generator-owner' :
                                            user?.role === 'industry_owner' ? '/industry-owner' :
                                                '/city-admin'
                                }
                                replace
                            />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />

                {/* 404 */}
                <Route path="*" element={
                    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                        <div className="text-center">
                            <h1 className="text-6xl font-black text-gray-200 dark:text-gray-700">404</h1>
                            <p className="text-xl font-semibold text-gray-600 dark:text-gray-400 mt-2">Page not found</p>
                            <a href="/" className="mt-4 inline-block text-primary-600 hover:underline">Go to Dashboard</a>
                        </div>
                    </div>
                } />
            </Routes>
        </>
    );
}

export default App;
