package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"regexp"
)

// Finding represents a single leaked secret
type Finding struct {
	Line    int     `json:"line"`
	Match   string  `json:"match"`
	Type    string  `json:"type"`
	Entropy float64 `json:"entropy"`
}

// calculateEntropy executes the Shannon Entropy algorithm
func calculateEntropy(s string) float64 {
	if len(s) == 0 {
		return 0
	}
	freq := make(map[rune]float64)
	for _, char := range s {
		freq[char]++
	}

	length := float64(len(s))
	entropy := 0.0
	for _, count := range freq {
		p := count / length
		entropy -= p * math.Log2(p)
	}
	return entropy
}

func main() {
	// 1. The Signatures
	// Detects exact vendor matches (e.g., AWS)
	awsRegex := regexp.MustCompile(`\b(AKIA|ASIA|AGPA|AIDA|AROA|AIPA)[A-Z0-9]{16}\b`)

	// Detects any contiguous block of non-whitespace characters longer than 20 chars
	genericSecretRegex := regexp.MustCompile(`\S{20,}`)

	var findings []Finding

	// 2. Open the Stdin Buffer (This is how the VS Code extension will talk to Go)
	scanner := bufio.NewScanner(os.Stdin)
	lineNum := 1

	for scanner.Scan() {
		line := scanner.Text()

		// 3. Scan for Exact Vendor Matches
		if matches := awsRegex.FindAllString(line, -1); matches != nil {
			for _, match := range matches {
				findings = append(findings, Finding{
					Line:    lineNum,
					Match:   match,
					Type:    "AWS Access Key",
					Entropy: calculateEntropy(match),
				})
			}
		}

		// 4. Scan for Unknown Custom Secrets (The Entropy Check)
		if matches := genericSecretRegex.FindAllString(line, -1); matches != nil {
			for _, match := range matches {
				entropy := calculateEntropy(match)

				// If the string is mathematically random (Entropy > 4.5)
				if entropy > 4.5 {
					// Ensure we don't log the AWS key twice
					if !awsRegex.MatchString(match) {
						findings = append(findings, Finding{
							Line:    lineNum,
							Match:   match,
							Type:    "High Entropy Secret (Custom)",
							Entropy: entropy, // We return this to show the user the math
						})
					}
				}
			}
		}
		lineNum++
	}

	if err := scanner.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "Error reading stdin: %v\n", err)
		os.Exit(1)
	}

	// 5. Output pure JSON. This allows ANY IDE (VS Code, IntelliJ) to parse the results.
	if len(findings) == 0 {
		fmt.Println("[]")
		return
	}

	output, _ := json.MarshalIndent(findings, "", "  ")
	fmt.Println(string(output))
}
