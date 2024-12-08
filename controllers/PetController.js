const getToken = require("../helpers/get-token")
const getUserByToken = require("../helpers/get-user-by-token")
const Pet = require("../models/Pet")
const ObjectId = require("mongoose").Types.ObjectId



module.exports = class PetController {
    static async create(req, res) {
        const { name, age, weight, color } = req.body

        const available = true
        const images = req.files
        if (!name) {
            res.status(422).json({ message: "O nome é obrigatório!" })
            return
        }
        if (!age) {
            res.status(422).json({ message: "A idade é obrigatória!" })
            return
        }
        if (!weight) {
            res.status(422).json({ message: "O peso é obrigatório!" })
            return
        }
        if (!color) {
            res.status(422).json({ message: "A cor é obrigatória!" })
            return
        }
        if (!images.length) {
            res.status(422).json({ message: "A imagem é obrigatória!" })
            return
        }

        const token = getToken(req)

        const user = await getUserByToken(token)

        const pet = new Pet({
            name,
            age,
            weight,
            color,
            available,
            images: [],
            user: {
                _id: user._id,
                name: user.name,
                image: user.image,
                phone: user.phone
            }
        })

        images.map((image) => {
            pet.images.push(image.filename)
        })
        try {
            const newPet = await pet.save()
            res.status(201).json({
                message: "Pet cadastrado com sucesso!",
                pet
            })
        } catch (error) {
            res.status(500).json({ message: error })
        }
    }

    static async getAll(req, res) {
        const pets = await Pet.find().sort("-createdAt")
        res.status(200).json({
            pets
        })
    }

    static async getAllUserPets(req, res) {
        const token = getToken(req)
        const user = await getUserByToken(token)
        const pets = await Pet.find({ 'user._id': user._id }).sort('-createdAt')
        res.status(200).json({
            pets
        })
    }

    static async getAllUserAdoptions(req, res) {
        const token = getToken(req)
        const user = await getUserByToken(token)
        const pets = await Pet.find({ 'adopter._id': user._id }).sort('-createdAt')
        res.status(200).json({
            pets
        })
    }

    static async getPetById(req, res) {
        const { id } = req.params

        if (!ObjectId.isValid(id)) {
            res.status(422).json({ message: "ID inválido!" })
            return
        }
        const pet = await Pet.findById(id)
        console.log(pet);

        if (!pet) {
            res.status(404).json({
                message: "Pet não encontrado!"
            })
            return
        }

        res.status(200).json({
            pet
        })
    }

    static async removePetById(req, res) {
        const { id } = req.params


        if (!ObjectId.isValid(id)) {
            res.status(422).json({ message: "ID inválido!" })
            return
        }

        const pet = await Pet.findById(id)
        if (!pet) {
            res.status(404).json({
                message: "Pet não encontrado!"
            })
            return
        }

        const token = getToken(req)
        const user = await getUserByToken(token)

        if (pet.user._id.toString() !== user._id.toString()) {
            res.status(404).json({
                message: "Houve um problema ao processar a sua solicitação!"
            })
            return
        }

        await Pet.findByIdAndDelete(id)

        res.status(200).json({
            message: "Pet removido com sucesso!"
        })
    }

    static async updatePet(req, res) {
        const { id } = req.params


        const { name, age, weight, color, available } = req.body

        const images = req.files

        const updatedData = {}

        const pet = await Pet.findById(id)
        if (!pet) {
            res.status(404).json({
                message: "Pet não encontrado!"
            })
            return
        }

        const token = getToken(req)
        const user = await getUserByToken(token)

        if (pet.user._id.toString() !== user._id.toString()) {
            res.status(402).json({
                message: "Houve um problema ao processar a sua solicitação!"
            })
            return
        } else {
            updatedData.name = name
        }

        if (!name) {
            res.status(422).json({ message: "O nome é obrigatório!" })
            return
        } else {
            updatedData.name = name
        }
        if (!age) {
            res.status(422).json({ message: "A idade é obrigatória!" })
            return
        } else {
            updatedData.age = age
        }
        if (!weight) {
            res.status(422).json({ message: "O peso é obrigatório!" })
            return
        } else {
            updatedData.weight = weight
        }
        if (!color) {
            res.status(422).json({ message: "A cor é obrigatória!" })
            return
        } else {
            updatedData.color = color
        }
        if (!images.length) {
            res.status(422).json({ message: "A imagem é obrigatória!" })
            return
        } else {
            updatedData.images = []
            images.map((image) =>
                updatedData.images.push(image.filename))
        }


        await Pet.findByIdAndUpdate(id, updatedData)
        return res.status(200).json({ message: "Pet atualizado com sucesso!" })
    }



  static async schedule(req, res) {
    // #swagger.tags = ['Pet']
    // #swagger.summary = 'Agendar uma visita com o Pet'
    const id = req.params.id;

    // check if pet exists
    if (!ObjectId.isValid(id)) {
      res.status(422).json({ message: "ID inválido", errors: ["ID inválido"] });
      return;
    }

    const pet = await Pet.findOne({ _id: id });
    if (!pet) {
      res.status(404).json({
        message: "Pet não encontrado",
        errors: ["Pet não encontrado"],
      });
      return;
    }

    // check if logged in user registered the pet
    // get user from token
    const token = getToken(req);
    const user = await getUserByToken(token);

    if (pet.user._id.equals(user._id)) {
      res.status(422).json({
        message: "Você não pode agendar uma visita com o seu próprio Pet!",
        errors: ["Você não pode agendar uma visita com o seu próprio Pet!"],
      });
      return;
    }

    // check if user has already scheludeda visit
    if (pet.adopter && pet.adopter._id.equals(user._id)) {
      res.status(422).json({
        message: "Você já agendou uma visita para este Pet!",
        errors: ["Você já agendou uma visita para este Pet!"],
      });
      return;
    }

    // add user to pet
    pet.adopter = {
      _id: user._id,
      name: user.name,
      image: user.image,
    };

    try {
      await Pet.findByIdAndUpdate(pet._id, pet);
      res.status(200).json({
        message: `A foi visita foi agendada com sucesso, entre em contato com ${pet.user.name} pelo telefone ${pet.user.phone}!`,
      });
    } catch (error) {
      res.status(500).json({
        message: [err],
        errors: [err],
      });
    }
  }

  static async concludeAdoption(req, res) {
    // #swagger.tags = ['Pet']
    // #swagger.summary = 'Conclui a adoção de um Pet'
    const id = req.params.id;

    // check if pet exists
    if (!ObjectId.isValid(id)) {
      res.status(422).json({ message: "ID inválido", errors: ["ID inválido"] });
      return;
    }

    const pet = await Pet.findOne({ _id: id });
    if (!pet) {
      res.status(404).json({
        message: "Pet não encontrado",
        errors: ["Pet não encontrado"],
      });
      return;
    }

    // check if logged in user registered the pet
    // get user from token
    const token = getToken(req);
    const user = await getUserByToken(token);

    if (pet.user._id.toString() !== user._id.toString()) {
      res
        .status(422)
        .json({ message: "Acesso negado!", errors: ["Acesso negado!"] });
      return;
    }

    pet.available = false;

    await Pet.findByIdAndUpdate(id, pet);

    res.status(200).json({
      message: "Parabéns! O ciclo de adoção foi finalizado com sucesso!",
    });
  }
}