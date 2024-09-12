import React from 'react';

const Blog = () => {
  // In a real application, this data would come from an API or CMS
  const blogPosts = [
    { id: 1, title: "Understanding React", date: "August 1, 2023", excerpt: "An introduction to React and its ecosystem." },
    { id: 2, title: "Building a Portfolio", date: "September 10, 2023", excerpt: "How to create a professional portfolio website." }
  ];

  return (
    <div className="p-8 bg-white">
      <h2 className="text-3xl font-bold mb-4">Latest Blog Posts</h2>
      <ul className="space-y-4">
        {blogPosts.map(post => (
          <li key={post.id} className="border-b pb-4">
            <h3 className="text-xl font-semibold">{post.title}</h3>
            <span className="block text-sm text-gray-500">{post.date}</span>
            <p className="mt-2">{post.excerpt}</p>
            <a href="#" className="text-primary mt-2 inline-block">Read more</a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Blog;
