from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Sample data (in a real application, use a database)
portfolio_data = {
    "bio": {
    "name": "Bharath Genji Mohanaranga",
    "intro": "Data Scientist and Cloud Engineer based in Washington DC with expertise in developing and deploying data-driven solutions.",
    "professional_summary": "I specialize in cloud and data engineering, machine learning, and data analytics. My experience spans from building AI/ML applications to modernizing data infrastructure and optimizing data workflows. I am passionate about leveraging data to drive meaningful insights and create innovative solutions."
  },
    "portfolio": [
    {
      "title": "Analyzing Booking Data for a Major Hotel Chain",
      "description": "Developed an analytical framework to examine booking data for a hotel chain to improve revenue management and customer retention.",
      "technologies": ["Python", "Pandas", "Matplotlib", "Seaborn", "Jupyter Notebook"],
      "github_link": "https://github.com/Bharath-GM/Analyzing-Booking-Data-for-Major-Hotel-Chain"
    },
    {
      "title": "Backend Development for Web Applications",
      "description": "Designed and implemented a RESTful backend architecture for a web application, focusing on scalability and performance optimization.",
      "technologies": ["Python", "Flask", "SQLAlchemy", "PostgreSQL", "Docker"],
      "github_link": "https://github.com/Bharath-GM/BackendDev"
    },
    {
      "title": "Prediction of Heart Attack Risk in Global Populations",
      "description": "Created a machine learning model to predict heart attack risks across global populations using demographic and medical data.",
      "technologies": ["Python", "Scikit-Learn", "Pandas", "Matplotlib", "XGBoost"],
      "github_link": "https://github.com/Bharath-GM/Prediction-of-Heart-Attack-Risk-in-Global-Populations"
    },
    {
      "title": "US Apartment Market Insights",
      "description": "Developed a data analytics dashboard to provide insights into the US apartment market, analyzing trends and investment opportunities.",
      "technologies": ["Python", "Tableau", "Pandas", "Seaborn"],
      "github_link": "https://github.com/Bharath-GM/US-Apartment-Market-Insights"
    },
    {
      "title": "Performance Evaluation of Scalability in SQL and NoSQL Data Warehousing",
      "description": "Conducted a comparative analysis of the performance and scalability of SQL and NoSQL databases under varying workloads.",
      "technologies": ["SQL", "NoSQL (MongoDB)", "PostgreSQL", "Python", "Apache Benchmark"],
      "github_link": "https://github.com/bharathgenji/Performance-Evaluation-of-Scalability-in-SQL-and-NoSQL-Data-Warehousing-Across-Two-Diverse-Databases"
    },
    {
      "title": "Course Recommendation Engine",
      "description": "Built a recommendation engine that suggests courses to users based on their interests and learning history using collaborative and content-based filtering.",
      "technologies": ["Python", "Scikit-Learn", "Pandas", "NumPy", "Flask"],
      "github_link": "https://github.com/Bharath-GM/Course-Recommendation-Engine"
    },
    {
      "title": "AWS YouTube Analytics Pipeline",
      "description": "Designed an end-to-end data pipeline on AWS to analyze YouTube video data, leveraging AWS services for data collection, processing, and visualization.",
      "technologies": ["AWS (S3, Lambda, Redshift)", "Python", "SQL", "Apache Airflow"],
      "github_link": "https://github.com/bharathgenji/AWS-Youtube-Analytics-Pipeline"
    },
    {
      "title": "CTPO Demo Projects",
      "description": "Contributed to various projects under the CTPO initiative, developing and testing machine learning applications and integrating AI technologies.",
      "technologies": ["Python", "Docker", "TensorFlow", "PyTorch", "Flask"],
      "github_link": "https://github.com/Infotrend-Inc/CTPO-Demo_Projects"
    }
  ],
    "speaking_engagements": [
    {
      "title": "Datathon 2024",
      "event": "Organized by Department of Data Science",
      "date": "March 2024",
      "location": "The George Washington University"
    },
    {
      "title": "ITC & GWU AI/ML Bracket Challenge Winners",
      "event": "Team E-620",
      "date": "April 2024",
      "location": "ITC & GWU",
      "description": "Our team, E-620, won the AI/ML Bracket Challenge with an overall score of 1370, placing us in the 97.8 percentile. Correctly predicting UConn as the national champion secured our first-place finish."
    }
  ]
}

# Routes for API Endpoints
@app.route('/api/bio', methods=['GET'])
def get_bio():
    return jsonify(portfolio_data["bio"])

@app.route('/api/experience', methods=['GET'])
def get_experience():
    return jsonify(portfolio_data["experience"])

@app.route('/api/portfolio', methods=['GET'])
def get_portfolio():
    return jsonify(portfolio_data["portfolio"])

@app.route('/api/speaking-engagements', methods=['GET'])
def get_speaking_engagements():
    return jsonify(portfolio_data["speaking_engagements"])

# Contact Form Submission Endpoint
@app.route('/api/contact', methods=['POST'])
def submit_contact():
    data = request.json
    print("Contact Form Submitted:", data)
    # Here you could add logic to save this to a database or send an email
    return jsonify({"status": "success", "message": "Contact form submitted successfully!"})

# Mentoring Booking Endpoint
@app.route('/api/mentoring-booking', methods=['POST'])
def mentoring_booking():
    data = request.json
    print("Mentoring Booking:", data)
    # Logic for booking a mentoring session can be added here
    return jsonify({"status": "success", "message": "Mentoring session booked successfully!"})

if __name__ == '__main__':
    app.run(debug=True)
