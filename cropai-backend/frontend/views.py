# filepath: frontend/views.py
from django.shortcuts import render
from django.http import JsonResponse
import json

def home(request):
    return render(request, 'website2.html')

def predict_yield(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            crop = data.get('crop')
            area = data.get('area')
            soil = data.get('soil')
            rain = data.get('rain')
            temp = data.get('temp')
            irrigation = data.get('irrigation')

            # Placeholder for AI model prediction logic
            # Replace this with your actual model loading and prediction
            predicted_yield_per_ha = 3500  # Example value
            total_yield = predicted_yield_per_ha * float(area)

            return JsonResponse({
                'yieldPerHa': predicted_yield_per_ha,
                'totalYield': total_yield,
                'message': 'Prediction successful (mock data)'
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Invalid request method'}, status=405)

def learning_resources(request):
    return render(request, 'learning_resources.html')