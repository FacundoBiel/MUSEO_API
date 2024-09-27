import express from 'express';
import bodyParser from 'body-parser';
import translate from 'node-google-translate-skidz';
import fetch from 'node-fetch';

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(bodyParser.json());

app.get('/departments', async (req, res) => {
    try {
        const response = await fetch('https://collectionapi.metmuseum.org/public/collection/v1/departments');
        const data = await response.json();
        res.json(data.departments);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching departments' });
    }
});

app.get('/search', async (req, res) => {
    const { department, keyword, location } = req.query;
    let apiUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=${encodeURIComponent(keyword || 'flowers')}`;
    
    if (department) {
        apiUrl += `&departmentId=${department}`;
    }
    
    if (location) {
        apiUrl += `&geoLocation=${encodeURIComponent(location)}`;
    }
    
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching object IDs' });
    }
});

app.get('/object/:id', async (req, res) => {
    try {
        const response = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${req.params.id}`);
        const data = await response.json();
        
        // Verificar si el título existe o está vacío, si es así asignar "Sin título"
        if (!data.title || data.title.trim() === "") {
            data.title = "Sin título";
        }
        
        const fieldsToTranslate = [
            'title', 'culture', 'dynasty', 'period', 'objectName', 
            'objectDate', 'medium', 'dimensions', 'classification', 
            'department', 'artistDisplayName', 'artistDisplayBio'
        ];

        const translatedFields = await Promise.all(
            fieldsToTranslate.map(async (field) => {
                if (data[field]) {
                    const translatedText = await translateText(data[field], 'es');
                    return { [field]: translatedText };
                }
                return { [field]: field === 'title' ? 'Sin título' : 'Desconocido' };
            })
        );

        const translatedData = {
            ...data,
            ...Object.assign({}, ...translatedFields)
        };

        console.log('Título original:', data.title);
        console.log('Título traducido:', translatedData.title);

        res.json(translatedData);
    } catch (error) {
        console.error('Error fetching or translating object data:', error);
        res.status(500).json({ error: 'Error fetching or translating object data' });
    }
});

const translateText = async (text, targetLang) => {
    if (!text) return 'Desconocido';
    console.log(`Traduciendo: ${text}`);
    
    return new Promise((resolve, reject) => {
        translate({
            text,
            target: targetLang
        }, (result) => {
            if (result && result.translation) {
                console.log(`Traducción: ${result.translation}`);
                resolve(result.translation);
            } else {
                console.error('Error en la traducción:', result?.error || 'Respuesta inválida');
                resolve(text); // En caso de error, devolver el texto original
            }
        });
    });
};

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
