package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/boltdb/bolt"
	"github.com/labstack/echo/v4"
)

type QuestionAnswer struct {
	UUID     string `json:"uuid"`
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

type RequestBody struct {
	TelNumber string           `json:"tel_number"`
	QAList    []QuestionAnswer `json:"qa_list"`
}

type AnswerResponse struct {
	TelNumber string           `json:"tel_number"`
	Questions []QuestionAnswer `json:"questions"`
	CheckIn   string           `json:"check_in"`
	CheckOut  *string          `json:"checkout,omitempty"`
}

var db *bolt.DB

func initDB() {
	var err error
	db, err = bolt.Open("questions_answers.db", 0600, nil)
	if err != nil {
		log.Fatal(err)
	}
}

func storeAnswers(c echo.Context) error {
	var body RequestBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	checkInTime := time.Now().Format(time.RFC3339)

	// Start a database transaction
	err := db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket([]byte("qa_data"))
		if b == nil {
			var err error
			b, err = tx.CreateBucket([]byte("qa_data"))
			if err != nil {
				return err
			}
		}

		// Check if there's already an entry for the given tel_number
		existingEntry := b.Get([]byte(body.TelNumber))
		if existingEntry != nil {
			// If entry exists, append the new questions to the existing ones
			var existingQuestions []QuestionAnswer
			if err := json.Unmarshal(existingEntry, &existingQuestions); err != nil {
				return err
			}

			existingQuestions = append(existingQuestions, body.QAList...)
			updatedEntry, err := json.Marshal(existingQuestions)
			if err != nil {
				return err
			}

			b.Put([]byte(body.TelNumber), updatedEntry)
		} else {
			// If no entry exists, insert new record
			record := struct {
				TelNumber string
				Questions []QuestionAnswer
				CheckIn   string
				CheckOut  *string
			}{
				TelNumber: body.TelNumber,
				Questions: body.QAList,
				CheckIn:   checkInTime,
				CheckOut:  nil,
			}

			recordData, err := json.Marshal(record)
			if err != nil {
				return err
			}

			b.Put([]byte(body.TelNumber), recordData)
		}

		return nil
	})

	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "OK"})
}

func updateCheckout(c echo.Context) error {
	telNumber := c.Param("tel_number")
	uuid := c.Param("uuid")

	checkOutTime := time.Now().Format(time.RFC3339)

	// Start a database transaction
	err := db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket([]byte("qa_data"))
		if b == nil {
			return fmt.Errorf("Bucket not found")
		}

		recordData := b.Get([]byte(telNumber))
		if recordData == nil {
			return echo.NewHTTPError(http.StatusNotFound, "Record not found")
		}

		var record struct {
			TelNumber string
			Questions []QuestionAnswer
			CheckIn   string
			CheckOut  *string
		}

		if err := json.Unmarshal(recordData, &record); err != nil {
			return err
		}

		// Find the question by uuid and update checkout time
		for _, qa := range record.Questions {
			if qa.UUID == uuid {
				record.CheckOut = &checkOutTime
				break
			}
		}

		updatedRecordData, err := json.Marshal(record)
		if err != nil {
			return err
		}

		return b.Put([]byte(telNumber), updatedRecordData)
	})

	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status":   "Checkout time updated",
		"checkout": checkOutTime,
	})
}

func getAllAnswers(c echo.Context) error {
	var result []AnswerResponse

	err := db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket([]byte("qa_data"))
		if b == nil {
			return fmt.Errorf("Bucket not found")
		}

		return b.ForEach(func(k, v []byte) error {
			var record struct {
				TelNumber string
				Questions []QuestionAnswer
				CheckIn   string
				CheckOut  *string
			}

			if err := json.Unmarshal(v, &record); err != nil {
				return err
			}

			answerResp := AnswerResponse{
				TelNumber: record.TelNumber,
				Questions: record.Questions,
				CheckIn:   record.CheckIn,
				CheckOut:  record.CheckOut,
			}

			result = append(result, answerResp)
			return nil
		})
	})

	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, result)
}

func main() {
	initDB()
	defer db.Close()

	e := echo.New()

	// Group for API routes
	api := e.Group("/api")
	api.POST("/store_answers", storeAnswers)
	api.PUT("/update_checkout/:tel_number/:uuid", updateCheckout)
	api.GET("/get_all_answers", getAllAnswers)

	// Serve static files (frontend) from /frontend/dist
	e.Static("/", "/src/frontend/dist")

	e.Logger.Fatal(e.Start(":8080"))
}
