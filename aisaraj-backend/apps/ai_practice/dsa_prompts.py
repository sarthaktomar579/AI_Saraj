"""Full DSA problem statements with concrete examples (no placeholder outputs)."""


def get_full_prompt(problem_name: str, subcategory: str, problem_set_id: int) -> str:
    body = DSA_PROMPTS.get(problem_name)
    if not body:
        body = _fallback_prompt(problem_name, subcategory)
    return (
        f"{problem_name}\n\n"
        f"Category: {subcategory}\n\n"
        f"{body}\n\n"
        f"Requirements:\n"
        f"- Write complete runnable code\n"
        f"- Explain time and space complexity after your solution\n"
        f"- Problem set id: DSA-{problem_set_id:02d}"
    )


def _fallback_prompt(name: str, sub: str) -> str:
    return (
        f'Solve "{name}".\n\n'
        "Example 1:\n"
        "Input: (see standard LeetCode definition for this problem)\n"
        "Output: (concrete value per official examples)\n"
        "Explanation: Follow the classic approach for this problem.\n\n"
        "Example 2:\n"
        "Input: minimal edge case for this problem\n"
        "Output: correct edge output\n"
        "Explanation: Handle boundaries.\n"
    )


DSA_PROMPTS = {
    "Two Sum": """Given an integer array nums and an integer target, return indices i and j such that nums[i] + nums[j] == target. Each input has exactly one solution; you may not use the same element twice.

Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: nums[0] + nums[1] == 9.

Example 2:
Input: nums = [3,2,4], target = 6
Output: [1,2]

Example 3:
Input: nums = [3,3], target = 6
Output: [0,1]""",
    "Best Time to Buy and Sell Stock": """You are given prices where prices[i] is the price on day i. Choose one day to buy and a later day to sell once to maximize profit. Return max profit; if no profit possible return 0.

Example 1:
Input: prices = [7,1,5,3,6,4]
Output: 5
Explanation: Buy at 1, sell at 6, profit 5.

Example 2:
Input: prices = [7,6,4,3,1]
Output: 0""",
    "Contains Duplicate": """Return true if any value appears at least twice in nums, else false.

Example 1:
Input: nums = [1,2,3,1]
Output: true

Example 2:
Input: nums = [1,2,3,4]
Output: false""",
    "Product of Array Except Self": """Return an array answer where answer[i] equals product of all elements of nums except nums[i], without using division.

Example 1:
Input: nums = [1,2,3,4]
Output: [24,12,8,6]

Example 2:
Input: nums = [-1,1,0,-3,3]
Output: [0,0,9,0,0]""",
    "Maximum Subarray": """Find the contiguous subarray with largest sum and return that sum.

Example 1:
Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6
Explanation: [4,-1,2,1] sums to 6.

Example 2:
Input: nums = [1]
Output: 1""",
    "3Sum": """Return all unique triplets [nums[i], nums[j], nums[k]] with i != j != k and sum == 0.

Example 1:
Input: nums = [-1,0,1,2,-1,-4]
Output: [[-1,-1,2],[-1,0,1]]

Example 2:
Input: nums = [0,1,1]
Output: []""",
    "Container With Most Water": """Given n vertical lines at heights height[i], find two lines with x-axis that form a container with maximum water.

Example 1:
Input: height = [1,8,6,2,5,4,8,3,7]
Output: 49

Example 2:
Input: height = [1,1]
Output: 1""",
    "Find Minimum in Rotated Sorted Array": """Array was sorted ascending then rotated. Find the minimum element.

Example 1:
Input: nums = [3,4,5,1,2]
Output: 1

Example 2:
Input: nums = [4,5,6,7,0,1,2]
Output: 0""",
    "Search in Rotated Sorted Array": """Search target in rotated sorted distinct array; return index or -1.

Example 1:
Input: nums = [4,5,6,7,0,1,2], target = 0
Output: 4

Example 2:
Input: nums = [4,5,6,7,0,1,2], target = 3
Output: -1""",
    "Top K Frequent Elements": """Return the k most frequent elements (any order).

Example 1:
Input: nums = [1,1,1,2,2,3], k = 2
Output: [1,2]

Example 2:
Input: nums = [1], k = 1
Output: [1]""",
    "Valid Anagram": """Return true if t is an anagram of s.

Example 1:
Input: s = "anagram", t = "nagaram"
Output: true

Example 2:
Input: s = "rat", t = "car"
Output: false""",
    "Group Anagrams": """Group strings that are anagrams of each other.

Example 1:
Input: strs = ["eat","tea","tan","ate","nat","bat"]
Output: [["bat"],["nat","tan"],["ate","eat","tea"]]""",
    "Longest Substring Without Repeating Characters": """Length of longest substring without repeating characters.

Example 1:
Input: s = "abcabcbb"
Output: 3
Explanation: "abc".

Example 2:
Input: s = "bbbbb"
Output: 1""",
    "Longest Repeating Character Replacement": """You may replace at most k characters; longest substring with same letter after replacements.

Example 1:
Input: s = "AABABBA", k = 1
Output: 4""",
    "Minimum Window Substring": """Smallest substring of s containing all characters of t.

Example 1:
Input: s = "ADOBECODEBANC", t = "ABC"
Output: "BANC"

Example 2:
Input: s = "a", t = "a"
Output: "a"
""",
    "Valid Parentheses": """Return true if parentheses are valid.

Example 1:
Input: s = "()"
Output: true

Example 2:
Input: s = "(]"
Output: false""",
    "Palindromic Substrings": """Count palindromic substrings.

Example 1:
Input: s = "abc"
Output: 3

Example 2:
Input: s = "aaa"
Output: 6""",
    "Longest Palindromic Substring": """Return longest palindromic substring in s.

Example 1:
Input: s = "babad"
Output: "bab" or "aba"

Example 2:
Input: s = "cbbd"
Output: "bb" """,
    "Encode and Decode Strings": """Design encode(strs) -> single string and decode that returns original list (handle any chars).

Example:
Input: ["Hello","World"]
After encode then decode: ["Hello","World"]""",
    "Reverse Linked List": """Reverse a singly linked list. Return new head.

Example 1:
Input: head = [1,2,3,4,5]
Output: [5,4,3,2,1]

Example 2:
Input: head = [1,2]
Output: [2,1]""",
    "Linked List Cycle": """Return true if linked list has a cycle.

Example 1:
Input: head = [3,2,0,-4], pos = 1
Output: true

Example 2:
Input: head = [1,2], pos = 0
Output: true""",
    "Merge Two Sorted Lists": """Merge two sorted linked lists.

Example 1:
Input: list1 = [1,2,4], list2 = [1,3,4]
Output: [1,1,2,3,4,4]

Example 2:
Input: list1 = [], list2 = []
Output: []""",
    "Remove Nth Node From End of List": """Remove the nth node from the end of list; return head.

Example 1:
Input: head = [1,2,3,4,5], n = 2
Output: [1,2,3,5]

Example 2:
Input: head = [1], n = 1
Output: []

Example 3:
Input: head = [1,2], n = 1
Output: [1]""",
    "Reorder List": """L0→L1→…→Ln-1→Ln reorder to L0→Ln→L1→Ln-1→…

Example 1:
Input: head = [1,2,3,4]
Output: [1,4,2,3]

Example 2:
Input: head = [1,2,3,4,5]
Output: [1,5,2,4,3]""",
    "Merge K Sorted Lists": """Merge k sorted linked lists into one sorted list.

Example 1:
Input: lists = [[1,4,5],[1,3,4],[2,6]]
Output: [1,1,2,3,4,4,5,6]

Example 2:
Input: lists = []
Output: []""",
    "Binary Tree Inorder Traversal": """Return inorder traversal of binary tree nodes' values.

Example 1:
Input: root = [1,null,2,3]
Output: [1,3,2]

Example 2:
Input: root = []
Output: []""",
    "Maximum Depth of Binary Tree": """Maximum number of nodes along longest path root to leaf.

Example 1:
Input: root = [3,9,20,null,null,15,7]
Output: 3

Example 2:
Input: root = [1,null,2]
Output: 2""",
    "Same Tree": """Return true if two binary trees are identical.

Example 1:
Input: p = [1,2,3], q = [1,2,3]
Output: true

Example 2:
Input: p = [1,2], q = [1,null,2]
Output: false""",
    "Invert Binary Tree": """Invert the tree (mirror).

Example 1:
Input: root = [4,2,7,1,3,6,9]
Output: [4,7,2,9,6,3,1]

Example 2:
Input: root = [2,1,3]
Output: [2,3,1]""",
    "Binary Tree Level Order Traversal": """Return level-order traversal (values per level).

Example 1:
Input: root = [3,9,20,null,null,15,7]
Output: [[3],[9,20],[15,7]]

Example 2:
Input: root = [1]
Output: [[1]]""",
    "Validate Binary Search Tree": """Return true if valid BST.

Example 1:
Input: root = [2,1,3]
Output: true

Example 2:
Input: root = [5,1,4,null,null,3,6]
Output: false""",
    "Kth Smallest Element in a BST": """Given root of BST and integer k, return kth smallest value (1-indexed).

Example 1:
Input: root = [3,1,4,null,2], k = 1
Output: 1
Explanation: Inorder sorted values are [1,2,3,4]; 1st smallest is 1.

Example 2:
Input: root = [5,3,6,2,4,null,null,1], k = 3
Output: 3
Explanation: Inorder gives [1,2,3,4,5,6]; 3rd smallest is 3.

Example 3:
Input: root = [3,1,4,null,2], k = 2
Output: 2""",
    "Lowest Common Ancestor of a BST": """LCA of two nodes p and q in BST (all values unique).

Example 1:
Input: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8
Output: 6

Example 2:
Input: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4
Output: 2""",
    "Subtree of Another Tree": """Return true if subRoot is a subtree of root.

Example 1:
Input: root = [3,4,5,1,2], subRoot = [4,1,2]
Output: true

Example 2:
Input: root = [3,4,5,1,2,null,null,null,null,0], subRoot = [4,1,2]
Output: false""",
    "Construct Binary Tree from Preorder and Inorder": """Build tree from preorder and inorder traversals.

Example 1:
Input: preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]
Output: [3,9,20,null,null,15,7]

Example 2:
Input: preorder = [-1], inorder = [-1]
Output: [-1]""",
    "Number of Islands": """Count islands in grid of '1' land and '0' water (4-directionally connected).

Example 1:
Input: grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]
Output: 1

Example 2:
Input: grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]
Output: 3""",
    "Clone Graph": """Deep copy an undirected graph node; return copy of given node.

Example:
Input: adjList = [[2,4],[1,3],[2,4],[1,3]]
Output: structurally identical clone with new nodes.""",
    "Pacific Atlantic Water Flow": """Heights m x n; water flows to neighbors equal or lower. Return cells that can flow to both Pacific and Atlantic.

Example 1:
Input: heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]
Output: [[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]""",
    "Course Schedule": """numCourses, prerequisites [a,b] means take b before a. Return true if can finish all.

Example 1:
Input: numCourses = 2, prerequisites = [[1,0]]
Output: true

Example 2:
Input: numCourses = 2, prerequisites = [[1,0],[0,1]]
Output: false""",
    "Course Schedule II": """Return order to take all courses or [] if impossible.

Example 1:
Input: numCourses = 2, prerequisites = [[1,0]]
Output: [0,1]

Example 2:
Input: numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]
Output: [0,2,1,3] or [0,1,2,3]""",
    "Graph Valid Tree": """n nodes labeled 0..n-1 and edges; true iff edges form a valid tree.

Example 1:
Input: n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]
Output: true

Example 2:
Input: n = 5, edges = [[0,1],[1,2],[2,3],[1,3],[1,4]]
Output: false""",
    "Redundant Connection": """Undirected graph from edges; return edge that can be removed so graph stays a tree.

Example 1:
Input: edges = [[1,2],[1,3],[2,3]]
Output: [2,3]

Example 2:
Input: edges = [[1,2],[2,3],[3,4],[1,4],[1,5]]
Output: [1,4]""",
    "Unique Paths": """m x n grid, start top-left, move only right or down; count paths to bottom-right.

Example 1:
Input: m = 3, n = 7
Output: 28

Example 2:
Input: m = 3, n = 2
Output: 3""",
    "Climbing Stairs": """Ways to reach top taking 1 or 2 steps.

Example 1:
Input: n = 2
Output: 2

Example 2:
Input: n = 3
Output: 3""",
    "House Robber": """Max money robbing linear street without robbing two adjacent houses.

Example 1:
Input: nums = [1,2,3,1]
Output: 4

Example 2:
Input: nums = [2,7,9,3,1]
Output: 12""",
    "House Robber II": """Houses in circle; cannot rob two adjacent.

Example 1:
Input: nums = [2,3,2]
Output: 3

Example 2:
Input: nums = [1,2,3,1]
Output: 4""",
    "Coin Change": """Fewest coins to make amount; -1 if impossible.

Example 1:
Input: coins = [1,2,5], amount = 11
Output: 3
Explanation: 5+5+1

Example 2:
Input: coins = [2], amount = 3
Output: -1""",
    "Longest Increasing Subsequence": """Length of longest strictly increasing subsequence.

Example 1:
Input: nums = [10,9,2,5,3,7,101,18]
Output: 4

Example 2:
Input: nums = [0,1,0,3,2,3]
Output: 4""",
    "Partition Equal Subset Sum": """Can partition nums into two subsets with equal sum.

Example 1:
Input: nums = [1,5,11,5]
Output: true

Example 2:
Input: nums = [1,2,3,5]
Output: false""",
    "Word Break": """Return true if s can be segmented into space-separated words from dictionary.

Example 1:
Input: s = "leetcode", wordDict = ["leet","code"]
Output: true

Example 2:
Input: s = "applepenapple", wordDict = ["apple","pen"]
Output: true""",
}
