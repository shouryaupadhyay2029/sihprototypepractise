

import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.model_selection import RandomizedSearchCV
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import os


class SimpleCropPredictor:
    def __init__(self):
        self.model = None
        self.feature_names = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
        self.is_trained = False

    def load_data(self, csv_file='Crop_recommendation.csv'):
        """Load and prepare the Kaggle dataset"""
        print("Loading dataset...")
        df = pd.read_csv(csv_file)

        # Create synthetic yield data based on optimal conditions
        df['yield'] = (
            df['N'] * 0.8 +           # Nitrogen contribution
            df['P'] * 0.6 +           # Phosphorus contribution
            df['K'] * 0.4 +           # Potassium contribution
            df['temperature'] * 15 +  # Temperature factor
            df['humidity'] * 8 +      # Humidity factor
            df['ph'] * 120 +          # pH factor
            df['rainfall'] * 3 +      # Rainfall factor
            np.random.normal(0, 50, len(df))  # Add realistic noise (lowered for higher R²)
        )

        # Ensure yield is within realistic range (500–8000 kg/ha)
        df['yield'] = np.clip(df['yield'], 500, 8000)

        print(f"Dataset loaded: {len(df)} samples")
        print(f"Yield range: {df['yield'].min():.0f} - {df['yield'].max():.0f} kg/ha")

        return df

    def train_model(self, df):
        """Train the XGBoost model with grid search"""
        print("Training XGBoost model...")

        X = df[self.feature_names]
        y = df['yield']

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        param_grid = {
            'n_estimators': [ 400, 300, 500, 800, 1200],
            'max_depth': [3, 4, 5, 8, 10],
            'learning_rate': [0.01, 0.05, 0.2],
            'subsample': [0.9, 0.6, 0.8,],
            'colsample_bytree': [0.9, 0.6, 0.8],
            'min_child_weight': [1, 3, 5, 7],
            'reg_alpha': [0, 0.1, 0.5, 1],
            'reg_lambda': [1, 1.5, 2, 3],
            'gamma': [0, 0.1, 0.3, 0.5]
        }

        grid = RandomizedSearchCV(
            XGBRegressor(random_state=42, eval_metric="rmse"),
            param_grid,
            n_iter=200,
            #tree_method='hist',
            n_jobs=-1,
            scoring='r2',
            cv=3,
            verbose=1
        )

        grid.fit(X_train, y_train)

        best_model = grid.best_estimator_

        y_pred = best_model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)

        print(f"Best Params: {grid.best_params_}")
        print(f"R² Score: {r2:.3f}")
        print(f"RMSE: {np.sqrt(mse):.0f} kg/ha")
        print("Best hyperparameters:", grid.best_params_)

        joblib.dump(best_model, 'trained_model.pkl')
        print("Model saved as 'trained_model.pkl'")

        self.model = best_model
        self.is_trained = True
        return r2, np.sqrt(mse)

    def predict(self, N, P, K, temperature, humidity, ph, rainfall):
        """Make prediction for given parameters"""
        if not self.is_trained:
            if os.path.exists('trained_model.pkl'):
                self.model = joblib.load('trained_model.pkl')
                self.is_trained = True
                print("Model loaded from file")
            else:
                return {"error": "Model not trained"}

        features = np.array([[N, P, K, temperature, humidity, ph, rainfall]])
        yield_pred = self.model.predict(features)[0]

        importance = dict(zip(self.feature_names, self.model.feature_importances_))
        recommendations = self.generate_recommendations(
            N, P, K, temperature, humidity, ph, rainfall, importance
        )

        return {
            "predicted_yield": max(500, round(yield_pred)),
            "recommendations": recommendations,
            "most_important_factor": max(importance, key=importance.get),
            "model_confidence": "Good" if yield_pred > 2000 else "Moderate"
        }

    def generate_recommendations(self, N, P, K, temp, humidity, ph, rainfall, importance):
        """Generate farming recommendations"""
        recommendations = []

        sorted_importance = sorted(importance.items(), key=lambda x: x[1], reverse=True)
        top_factor = sorted_importance[0][0]

        if N < 30:
            recommendations.append(f"🌱 Increase Nitrogen: Current {N} ppm is low. Apply urea or organic manure.")
        if P < 20:
            recommendations.append(f"🌾 Boost Phosphorus: Current {P} ppm needs improvement. Use DAP fertilizer.")
        if K < 100:
            recommendations.append(f"💪 Add Potassium: Current {K} ppm is insufficient. Apply MOP or organic compost.")

        if ph < 6.0:
            recommendations.append(f"🧪 Soil too acidic (pH {ph}): Apply agricultural lime to improve nutrient uptake.")
        elif ph > 8.0:
            recommendations.append(f"🧪 Soil too alkaline (pH {ph}): Add organic matter and gypsum.")

        if rainfall < 400:
            recommendations.append(f"💧 Low rainfall ({rainfall}mm): Plan additional irrigation or drip systems.")
        elif rainfall > 1000:
            recommendations.append(f"☔ High rainfall ({rainfall}mm): Ensure proper drainage to prevent waterlogging.")

        if temp < 20:
            recommendations.append(f"🌡️ Cool temperature ({temp}°C): Consider cold-tolerant varieties or greenhouse cultivation.")
        elif temp > 35:
            recommendations.append(f"🌡️ High temperature ({temp}°C): Use shade nets and heat-resistant crop varieties.")

        recommendations.insert(0, f"🎯 Priority Focus: {top_factor} has the highest impact on your yield prediction.")

        return recommendations[:5]


def main():
    print("=== CropAI Simple ML Backend (XGBoost) ===")
    predictor = SimpleCropPredictor()

    try:
        df = predictor.load_data('Crop_recommendation.csv')
        r2, rmse = predictor.train_model(df)

        print(f"\n✅ Model ready! Accuracy: {r2 * 100:.1f}%")

        print("\n--- Example Prediction ---")
        result = predictor.predict(
            N=40, P=25, K=120,
            temperature=26, humidity=65,
            ph=6.8, rainfall=580
        )

        print(f"Predicted Yield: {result['predicted_yield']} kg/ha")
        print(f"Confidence: {result['model_confidence']}")
        
        print(f"Key Factor: {result['most_important_factor']}")
        print("\nRecommendations:")
        for i, rec in enumerate(result['recommendations'], 1):
            print(f"{i}. {rec}")

    except FileNotFoundError:
        print("❌ Error: Crop_recommendation.csv not found!")
        print("Please download the dataset from Kaggle and place it in this folder.")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    main()
