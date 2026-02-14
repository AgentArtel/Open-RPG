import React, { useState } from 'react';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { SearchBar } from '@/components/workflow/SearchBar';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { Chip } from '@/components/ui-custom/Chip';
import { Sparkles } from 'lucide-react';

const mockTemplates = [
  {
    id: '1',
    name: 'AI Content Generator',
    description: 'Generate blog posts, social media content, and marketing copy using AI',
    category: 'Marketing',
    difficulty: 'beginner' as const,
    nodes: 5,
  },
  {
    id: '2',
    name: 'Customer Support Bot',
    description: 'Automated responses to common customer inquiries with AI',
    category: 'Support',
    difficulty: 'intermediate' as const,
    nodes: 8,
  },
  {
    id: '3',
    name: 'Lead Scoring Automation',
    description: 'Score and route leads based on behavior and demographics',
    category: 'Sales',
    difficulty: 'advanced' as const,
    nodes: 12,
  },
  {
    id: '4',
    name: 'Social Media Scheduler',
    description: 'Schedule and publish posts across multiple platforms',
    category: 'Marketing',
    difficulty: 'beginner' as const,
    nodes: 4,
  },
  {
    id: '5',
    name: 'Data Pipeline',
    description: 'Extract, transform, and load data between systems',
    category: 'DevOps',
    difficulty: 'advanced' as const,
    nodes: 15,
  },
  {
    id: '6',
    name: 'Email Drip Campaign',
    description: 'Automated email sequences based on user actions',
    category: 'Marketing',
    difficulty: 'intermediate' as const,
    nodes: 7,
  },
];

const categories = ['All', 'Marketing', 'Sales', 'Support', 'DevOps'];

export const AgentLibrary: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredTemplates = mockTemplates.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-dark text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Agent Library</h1>
          <p className="text-white/50 mt-1">Browse and use pre-built workflow templates</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <SearchBar 
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search templates..."
          className="max-w-md"
        />
        
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map((category) => (
            <Chip
              key={category}
              variant={selectedCategory === category ? 'green' : 'gray'}
              onClick={() => setSelectedCategory(category)}
              className="cursor-pointer"
            >
              {category}
            </Chip>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              {...template}
              onUse={() => console.log('Use', template.id)}
              onPreview={() => console.log('Preview', template.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No templates found"
          description="Try adjusting your search or filters"
          icon={<Sparkles className="w-8 h-8" />}
        />
      )}
    </div>
  );
};
