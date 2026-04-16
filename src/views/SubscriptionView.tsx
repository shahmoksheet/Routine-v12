import React, { useState } from 'react';
import TopBar from '../components/TopBar';
import { useAuth } from '../context/AuthContext';
import { PLAN_LIMITS, SubscriptionPlan } from '../utils/rbac';
import { CheckCircle2, CreditCard, AlertCircle } from 'lucide-react';

import { useOutletContext } from 'react-router-dom';
import { LayoutContextType } from '../App';

export default function SubscriptionView() {
  const { onMenuClick } = useOutletContext<LayoutContextType>();
  const { user, login } = useAuth();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const currentPlan = user?.subscriptionPlan || 'Free';

  const handleUpgrade = (plan: SubscriptionPlan) => {
    setIsUpgrading(true);
    // Simulate API call
    setTimeout(() => {
      if (user) {
        login({ ...user, subscriptionPlan: plan });
      }
      setIsUpgrading(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <TopBar title="Subscription" icon="credit_card" onMenuClick={onMenuClick} />
      
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Current Plan: {currentPlan}</h2>
              <p className="text-sm text-slate-500">Manage your billing and subscription details.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['Free', 'Pro', 'Enterprise'] as SubscriptionPlan[]).map((plan) => (
            <div 
              key={plan}
              className={`p-6 rounded-2xl border-2 transition-all ${currentPlan === plan ? 'border-primary-600 bg-primary-50' : 'border-slate-200 bg-white'}`}
            >
              <h3 className="font-bold text-xl text-slate-800 mb-2">{plan}</h3>
              <p className="text-2xl font-black text-slate-900 mb-6">
                {plan === 'Free' ? '$0' : plan === 'Pro' ? '$12' : 'Custom'}
                <span className="text-sm font-normal text-slate-500">/mo</span>
              </p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-primary-600" /> 
                  {PLAN_LIMITS[plan].workspaces === -1 ? 'Unlimited' : PLAN_LIMITS[plan].workspaces} Workspaces
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-primary-600" /> 
                  {PLAN_LIMITS[plan].usersPerWorkspace === -1 ? 'Unlimited' : PLAN_LIMITS[plan].usersPerWorkspace} Users per Workspace
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-primary-600" /> 
                  {PLAN_LIMITS[plan].departments === -1 ? 'Unlimited' : PLAN_LIMITS[plan].departments} Departments
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-primary-600" /> 
                  {PLAN_LIMITS[plan].storageGB}GB Storage
                </li>
                {PLAN_LIMITS[plan].features.map(feature => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-primary-600" /> {feature}
                  </li>
                ))}
              </ul>

              <button
                disabled={currentPlan === plan || isUpgrading}
                onClick={() => handleUpgrade(plan)}
                className={`w-full py-3 rounded-xl font-bold transition-all ${
                  currentPlan === plan 
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                    : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95 shadow-lg shadow-primary-600/20'
                }`}
              >
                {isUpgrading && currentPlan !== plan ? 'Upgrading...' : currentPlan === plan ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
        
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> Downgrading your plan may result in loss of access to certain features and data if you exceed the limits of the new plan. Please contact support for assistance with downgrading.
          </p>
        </div>
      </div>
    </div>
  );
}
