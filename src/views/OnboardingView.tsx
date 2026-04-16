import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { useWorkspaces } from '../context/WorkspaceContext';
import { motion } from 'motion/react';
import { Building2, CheckCircle2, Users, CreditCard, ArrowRight } from 'lucide-react';
import { PLAN_LIMITS, SubscriptionPlan } from '../utils/rbac';

export function OnboardingView() {
  const { user, login } = useAuth();
  const { setCurrentView } = useNavigation();
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState('');
  const [orgType, setOrgType] = useState<'solo' | 'small' | 'hierarchical'>('hierarchical');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('Free');
  const [invites, setInvites] = useState([{ email: '', role: 'Admin' }]);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleAddInvite = () => {
    setInvites([...invites, { email: '', role: orgType === 'small' ? 'Employee' : 'Admin' }]);
  };

  const { addWorkspace } = useWorkspaces();

  const handleComplete = async () => {
    if (user) {
      try {
        const workspaceId = await addWorkspace({
          name: workspaceName,
          subscriptionPlan: selectedPlan,
          org_type: orgType
        });
        
        login({
          ...user,
          workspaceId: workspaceId,
          subscriptionPlan: selectedPlan,
        });
        
        setCurrentView('dashboard');
      } catch (err) {
        console.error('Failed to create workspace', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Progress Bar */}
        <div className="bg-slate-100 h-2 w-full">
          <div 
            className="bg-primary-600 h-full transition-all duration-500"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Create your Workspace</h2>
                  <p className="text-slate-500">Let's set up your company's digital headquarters.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Workspace Name</label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="e.g., Acme Corp"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleNext}
                  disabled={!workspaceName.trim()}
                  className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  Next Step <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">How will you use Routine?</h2>
                  <p className="text-slate-500">We'll tailor the role system to fit your team size.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  onClick={() => setOrgType('solo')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${orgType === 'solo' ? 'border-primary-600 bg-primary-50' : 'border-slate-200 hover:border-primary-300'}`}
                >
                  <h3 className="font-bold text-lg text-slate-800">Just Me</h3>
                  <p className="text-sm text-slate-500 mb-4">Solo entrepreneur or freelancer.</p>
                  <ul className="text-xs space-y-2 text-slate-600">
                    <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary-600" /> No complex roles</li>
                    <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary-600" /> Simplified interface</li>
                  </ul>
                </div>
                <div 
                  onClick={() => setOrgType('small')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${orgType === 'small' ? 'border-primary-600 bg-primary-50' : 'border-slate-200 hover:border-primary-300'}`}
                >
                  <h3 className="font-bold text-lg text-slate-800">Small Team</h3>
                  <p className="text-sm text-slate-500 mb-4">Small shop or startup (2-15 people).</p>
                  <ul className="text-xs space-y-2 text-slate-600">
                    <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary-600" /> Owner & Employees</li>
                    <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary-600" /> Flat hierarchy</li>
                  </ul>
                </div>
                <div 
                  onClick={() => setOrgType('hierarchical')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${orgType === 'hierarchical' ? 'border-primary-600 bg-primary-50' : 'border-slate-200 hover:border-primary-300'}`}
                >
                  <h3 className="font-bold text-lg text-slate-800">Organization</h3>
                  <p className="text-sm text-slate-500 mb-4">Larger company or supermarket.</p>
                  <ul className="text-xs space-y-2 text-slate-600">
                    <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary-600" /> 4-Tier Hierarchy</li>
                    <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary-600" /> Departments & Managers</li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={handleBack}
                  className="px-6 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors"
                >
                  Next Step <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Choose a Plan</h2>
                  <p className="text-slate-500">Select the plan that fits your team's needs.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['Free', 'Pro', 'Enterprise'] as SubscriptionPlan[]).map((plan) => (
                  <div 
                    key={plan}
                    onClick={() => setSelectedPlan(plan)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPlan === plan ? 'border-primary-600 bg-primary-50' : 'border-slate-200 hover:border-primary-300'}`}
                  >
                    <h3 className="font-bold text-lg text-slate-800">{plan}</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      {plan === 'Free' ? '$0/mo' : plan === 'Pro' ? '$12/user/mo' : 'Custom pricing'}
                    </p>
                    <ul className="text-xs space-y-2 text-slate-600">
                      <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary-600" /> {PLAN_LIMITS[plan].workspaces === -1 ? 'Unlimited' : PLAN_LIMITS[plan].workspaces} Workspaces</li>
                      <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary-600" /> {PLAN_LIMITS[plan].usersPerWorkspace === -1 ? 'Unlimited' : PLAN_LIMITS[plan].usersPerWorkspace} Users/WS</li>
                      <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary-600" /> {PLAN_LIMITS[plan].storageGB}GB Storage</li>
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={handleBack}
                  className="px-6 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors"
                >
                  Next Step <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Invite your Team</h2>
                  <p className="text-slate-500">
                    {orgType === 'solo' ? "You can skip this step since you're flying solo." : `Add members to help you manage ${workspaceName}.`}
                  </p>
                </div>
              </div>

              {orgType !== 'solo' ? (
                <div className="space-y-4">
                  {invites.map((invite, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="email"
                        placeholder="Email address"
                        value={invite.email}
                        onChange={(e) => {
                          const newInvites = [...invites];
                          newInvites[index].email = e.target.value;
                          setInvites(newInvites);
                        }}
                        className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                      <select
                        value={invite.role}
                        onChange={(e) => {
                          const newInvites = [...invites];
                          newInvites[index].role = e.target.value;
                          setInvites(newInvites);
                        }}
                        className="px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                      >
                        {orgType === 'hierarchical' && <option value="Admin">Admin</option>}
                        {orgType === 'hierarchical' && <option value="Manager">Manager</option>}
                        <option value="Employee">Employee</option>
                      </select>
                    </div>
                  ))}
                  
                  <button
                    onClick={handleAddInvite}
                    className="text-primary-600 text-sm font-medium hover:text-primary-700"
                  >
                    + Add another invite
                  </button>
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-xl text-center text-slate-500 border border-slate-200">
                  You've selected the Solo template. You can always invite team members later from the Settings menu.
                </div>
              )}

              <div className="mt-8 flex justify-between">
                <button
                  onClick={handleBack}
                  className="px-6 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors"
                >
                  Complete Setup <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
