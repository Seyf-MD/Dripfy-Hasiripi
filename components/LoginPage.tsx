// FIX: Implemented the LoginPage component to handle user authentication.
import React from 'react';

const LoginPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
    return (
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
            <div className="w-full max-w-md p-8 space-y-8 bg-neutral-800 rounded-xl border border-neutral-700 shadow-2xl">
                <div>
                    <h1 className="text-4xl font-bold text-center text-[#32ff84] brand-glow">dripfy<span className="text-neutral-400">.</span></h1>
                    <p className="mt-2 text-center text-sm text-neutral-500">
                        Long-Life Startup Management Information System
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input id="email-address" name="email" type="email" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-neutral-600 bg-neutral-900 text-white placeholder-neutral-500 focus:outline-none focus:ring-[#32ff84] focus:border-[#32ff84] focus:z-10 sm:text-sm rounded-t-md" placeholder="Email address" defaultValue="demo@dripfy.com" />
                        </div>
                        <div>
                            <input id="password" name="password" type="password" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-neutral-600 bg-neutral-900 text-white placeholder-neutral-500 focus:outline-none focus:ring-[#32ff84] focus:border-[#32ff84] focus:z-10 sm:text-sm rounded-b-md" placeholder="Password" defaultValue="password" />
                        </div>
                    </div>
                    <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-[#32ff84] hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors">
                        Sign in
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
