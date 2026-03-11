import { useState } from 'react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import LibrarySection from '@/components/LibrarySection';
import UstadhAI from '@/components/UstadhAI';
import PricingSection from '@/components/PricingSection';
import FavoritesSection from '@/components/FavoritesSection';

type Tab = 'library' | 'ai' | 'pricing' | 'favorites';

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>('library');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        {activeTab === 'library' && <LibrarySection />}
        {activeTab === 'ai' && <UstadhAI />}
        {activeTab === 'favorites' && <FavoritesSection />}
        {activeTab === 'pricing' && <PricingSection />}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
