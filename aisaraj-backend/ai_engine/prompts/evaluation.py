"""Evaluation prompt templates for scoring."""

FINAL_EVALUATION = """
You are a senior technical hiring evaluator. Evaluate this complete interview transcript.

Topic: {topic}
Transcript:
{transcript}

Score each dimension strictly:
- Communication (0-20): clarity, structure, articulation of thought process
- Technical Depth (0-25): correctness, understanding of core concepts, edge case handling
- Code Quality (0-20): readability, naming conventions, modularity, error handling
- Optimization (0-15): time/space complexity awareness, trade-off discussion
- Problem Solving (0-20): systematic approach, problem breakdown, debugging methodology

Respond ONLY with valid JSON (no markdown, no explanation):
{{
  "score": <sum of all dimensions, 0-100>,
  "communication": <0-20>,
  "technical_depth": <0-25>,
  "code_quality": <0-20>,
  "optimization": <0-15>,
  "problem_solving": <0-20>,
  "strengths": ["specific strength 1", "specific strength 2"],
  "weaknesses": ["specific weakness 1", "specific weakness 2"],
  "improvement_plan": ["actionable step 1", "actionable step 2"],
  "recommended_topics": ["topic 1", "topic 2"],
  "hiring_signal": "Strong Hire" | "Hire" | "Consider" | "Reject",
  "skill_gap_analysis": {{"topic_name": "gap_description"}}
}}
"""
